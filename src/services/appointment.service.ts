import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { AppointmentRepository } from '../repositories/appointment.repository.js';
import { PatientRepository } from '../repositories/patient.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { NotificationService } from './notification.service.js';
import type { AppointmentDocument } from '../types/index.js';
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  CancelAppointmentInput,
} from '../schemas/appointment.schemas.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../middleware/error-handler.js';

export class AppointmentService {
  private apptRepo: AppointmentRepository;
  private patientRepo: PatientRepository;
  private auditRepo: AuditRepository;
  private notifService: NotificationService;

  constructor(db: Db) {
    this.apptRepo = new AppointmentRepository(db);
    this.patientRepo = new PatientRepository(db);
    this.auditRepo = new AuditRepository(db);
    this.notifService = new NotificationService(db);
  }

  async createAppointment(
    hospitalId: string,
    input: CreateAppointmentInput,
    actorUserId: string,
    actorRole: string,
    requestId: string,
  ): Promise<AppointmentDocument> {
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    if (startAt.getTime() >= endAt.getTime()) {
      throw new ValidationError('startAt must be strictly before endAt');
    }

    const durationMs = endAt.getTime() - startAt.getTime();
    if (durationMs < 5 * 60 * 1000) {
      throw new ValidationError('Appointment duration must be at least 5 minutes');
    }
    if (durationMs > 8 * 60 * 60 * 1000) {
      throw new ValidationError('Appointment duration cannot exceed 8 hours');
    }

    const patient = await this.patientRepo.findById(hospitalId, input.patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    // Patient role can only book for themselves
    if (actorRole === 'PATIENT') {
      const linked = await this.patientRepo.findByLinkedUserId(hospitalId, actorUserId);
      if (!linked || linked._id !== input.patientId) {
        throw new ForbiddenError('Patients can only schedule appointments for their own profile');
      }
    }

    // 1. Conflict Check: Doctor Overlap
    const doctorConflict = await this.apptRepo.findConflicting(hospitalId, {
      doctorUserId: input.doctorUserId,
      startAt,
      endAt,
    });
    if (doctorConflict) {
      throw new AppError(409, 'CONFLICT', 'Doctor already has an active appointment in this time slot', [
        {
          field: 'startAt',
          code: 'DOCTOR_SLOT_CONFLICT',
          message: 'The requested doctor has an overlapping scheduled appointment.',
        },
      ]);
    }

    // 2. Conflict Check: Patient Overlap
    const patientConflict = await this.apptRepo.findConflicting(hospitalId, {
      patientId: input.patientId,
      startAt,
      endAt,
    });
    if (patientConflict) {
      throw new AppError(409, 'CONFLICT', 'Patient already has an active appointment in this time slot', [
        {
          field: 'startAt',
          code: 'PATIENT_SLOT_CONFLICT',
          message: 'The patient has an overlapping scheduled appointment.',
        },
      ]);
    }

    const appointmentId = randomUUID();
    const doc: AppointmentDocument = {
      _id: appointmentId,
      hospitalId,
      patientId: input.patientId,
      doctorUserId: input.doctorUserId,
      startAt,
      endAt,
      status: 'BOOKED',
      reason: input.reason || null,
      cancelledBy: null,
      cancellationReason: null,
      cancelledAt: null,
      bookedBy: actorUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    await this.apptRepo.create(doc);

    // Audit event
    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'APPOINTMENT_BOOKED',
      resourceType: 'Appointment',
      resourceId: appointmentId,
      timestamp: new Date(),
      requestId,
      afterVersion: 1,
      reason: input.reason || 'Appointment scheduled',
      metadata: {
        patientId: input.patientId,
        doctorUserId: input.doctorUserId,
        startAt: doc.startAt,
        endAt: doc.endAt,
      },
    });

    // In-app notifications to doctor and patient
    await this.notifService.dispatchNotification(
      hospitalId,
      input.doctorUserId,
      'APPOINTMENT_BOOKED',
      appointmentId,
      'New Appointment Scheduled',
      `New appointment scheduled with patient ${patient.displayName} on ${doc.startAt.toISOString()}.`,
    );

    if (patient.linkedUserId) {
      await this.notifService.dispatchNotification(
        hospitalId,
        patient.linkedUserId,
        'APPOINTMENT_BOOKED',
        appointmentId,
        'Appointment Confirmed',
        `Your appointment has been confirmed for ${doc.startAt.toISOString()}.`,
      );
    }

    return doc;
  }

  async cancelAppointment(
    hospitalId: string,
    appointmentId: string,
    input: CancelAppointmentInput,
    actorUserId: string,
    actorRole: string,
    requestId: string,
  ): Promise<AppointmentDocument> {
    const existing = await this.apptRepo.findById(hospitalId, appointmentId);
    if (!existing) {
      throw new NotFoundError('Appointment not found');
    }

    if (actorRole === 'PATIENT') {
      const linked = await this.patientRepo.findByLinkedUserId(hospitalId, actorUserId);
      if (!linked || linked._id !== existing.patientId) {
        throw new ForbiddenError('Patients can only cancel their own appointments');
      }
    } else if (actorRole === 'DOCTOR') {
      if (existing.doctorUserId !== actorUserId) {
        throw new ForbiddenError('Doctors can only cancel their own scheduled appointments');
      }
    }

    if (existing.status === 'CANCELLED') {
      return existing;
    }

    const updated = await this.apptRepo.cancel(
      hospitalId,
      appointmentId,
      input.expectedVersion,
      actorUserId,
      input.reason,
    );

    if (!updated) {
      throw new ConflictError('Appointment version conflict. Reload and review the latest appointment.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'APPOINTMENT_CANCELLED',
      resourceType: 'Appointment',
      resourceId: appointmentId,
      timestamp: new Date(),
      requestId,
      beforeVersion: existing.version,
      afterVersion: updated.version,
      reason: input.reason || 'Appointment cancelled',
      metadata: {
        appointmentId,
      },
    });

    // Notify doctor and patient
    await this.notifService.dispatchNotification(
      hospitalId,
      existing.doctorUserId,
      'APPOINTMENT_CANCELLED',
      appointmentId,
      'Appointment Cancelled',
      `Appointment scheduled for ${existing.startAt.toISOString()} was cancelled.`,
    );

    const patient = await this.patientRepo.findById(hospitalId, existing.patientId);
    if (patient?.linkedUserId) {
      await this.notifService.dispatchNotification(
        hospitalId,
        patient.linkedUserId,
        'APPOINTMENT_CANCELLED',
        appointmentId,
        'Appointment Cancelled',
        `Your appointment scheduled for ${existing.startAt.toISOString()} was cancelled.`,
      );
    }

    return updated;
  }

  async listAppointments(
    hospitalId: string,
    query: ListAppointmentsQuery,
    actorUserId: string,
    actorRole: string,
  ): Promise<AppointmentDocument[]> {
    let targetPatientId = query.patientId;
    if (actorRole === 'PATIENT') {
      const linked = await this.patientRepo.findByLinkedUserId(hospitalId, actorUserId);
      if (!linked) {
        return [];
      }
      targetPatientId = linked._id;
    }

    const filter: {
      from?: Date;
      to?: Date;
      patientId?: string;
      doctorUserId?: string;
      cursor?: string;
      limit: number;
    } = { limit: query.limit };

    if (query.from) filter.from = new Date(query.from);
    if (query.to) filter.to = new Date(query.to);
    if (targetPatientId) filter.patientId = targetPatientId;
    if (query.doctorUserId) filter.doctorUserId = query.doctorUserId;
    if (query.cursor) filter.cursor = query.cursor;

    return this.apptRepo.list(hospitalId, filter);
  }
}
