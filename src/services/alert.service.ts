import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { AlertRepository } from '../repositories/alert.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { NotificationService } from './notification.service.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../middleware/error-handler.js';
import type {
  AlertDocument,
  AlertDispositionDocument,
  AlertStatus,
  DispositionType,
} from '../types/index.js';

export class AlertService {
  private alertRepo: AlertRepository;
  private auditRepo: AuditRepository;

  constructor(private db: Db) {
    this.alertRepo = new AlertRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async listAlerts(
    hospitalId: string,
    filter: { status?: AlertStatus; assignedDoctorId?: string; cursor?: string; limit: number },
  ) {
    const alerts = await this.alertRepo.list(hospitalId, filter);
    return alerts.map(formatAlert);
  }

  async getAlert(hospitalId: string, alertId: string) {
    const alert = await this.alertRepo.findById(hospitalId, alertId);
    if (!alert) {
      throw new NotFoundError('Alert not found');
    }
    const dispositions = await this.alertRepo.findDispositionsByAlertId(hospitalId, alertId);
    return {
      ...formatAlert(alert),
      dispositions,
    };
  }

  async acknowledgeAlert(
    hospitalId: string,
    alertId: string,
    expectedVersion: number,
    doctorUserId: string,
    requestId: string,
  ) {
    const alert = await this.alertRepo.findById(hospitalId, alertId);
    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    if (alert.status !== 'OPEN') {
      throw new ConflictError(`Cannot acknowledge alert in status: ${alert.status}`);
    }

    const updated = await this.alertRepo.acknowledge(
      hospitalId,
      alertId,
      expectedVersion,
      doctorUserId,
    );

    if (!updated) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: doctorUserId,
      action: 'ALERT_ACKNOWLEDGED',
      resourceType: 'Alert',
      resourceId: alertId,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: updated.version,
    });

    return formatAlert(updated);
  }

  async recordDisposition(
    hospitalId: string,
    alertId: string,
    expectedVersion: number,
    dispositionType: DispositionType,
    rationale: string,
    doctorUserId: string,
    requestId: string,
  ) {
    // TEST-ALERT-002 Invariant: Rationale mandatory and >= 3 characters
    if (!rationale || rationale.trim().length < 3) {
      throw new ValidationError('Disposition rationale must be at least 3 characters long', [
        {
          field: 'rationale',
          code: 'TOO_SHORT',
          message: 'Clinical disposition rationale must be at least 3 characters',
        },
      ]);
    }

    const alert = await this.alertRepo.findById(hospitalId, alertId);
    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    const newStatus: AlertStatus =
      dispositionType === 'CHANGE_REQUIRED' ? 'CHANGE_REQUIRED' : 'CLINICAL_DISPOSITION_RECORDED';

    const dispositionDoc: AlertDispositionDocument = {
      _id: randomUUID(),
      hospitalId,
      alertId,
      doctorId: doctorUserId,
      dispositionType,
      rationale: rationale.trim(),
      alertVersionAtDisposition: expectedVersion,
      recordedAt: new Date(),
    };

    const updated = await this.alertRepo.recordDisposition(
      hospitalId,
      alertId,
      expectedVersion,
      dispositionDoc,
      newStatus,
    );

    if (!updated) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    // TEST-AUDIT-001 Invariant: Disposition appends immutable audit event
    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: doctorUserId,
      action: 'ALERT_DISPOSITION_RECORDED',
      resourceType: 'AlertDisposition',
      resourceId: dispositionDoc._id,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: updated.version,
      reason: rationale.trim(),
      metadata: {
        alertId,
        dispositionType,
      },
    });

    // In-app notification to active pharmacists
    try {
      const membershipRepo = new MembershipRepository(this.db);
      const activeMembers = await membershipRepo.listByHospital(hospitalId, { status: 'ACTIVE' });
      const pharmacists = activeMembers.filter((m) => m.assignedRole === 'PHARMACIST');
      if (pharmacists.length > 0) {
        const notifService = new NotificationService(this.db);
        await notifService.dispatchMany(
          pharmacists.map((p) => ({
            hospitalId,
            recipientUserId: p.userId,
            type: 'ALERT_DISPOSITION_RECORDED' as const,
            subjectId: alertId,
            title: 'Alert Disposition Recorded',
            message: `Doctor recorded disposition ${dispositionType}: "${rationale.trim()}"`,
          })),
        );
      }
    } catch (err) {
      console.warn('Failed to dispatch alert disposition notification:', err);
    }

    return formatAlert(updated);
  }

  async resolveAlert(
    hospitalId: string,
    alertId: string,
    expectedVersion: number,
    doctorUserId: string,
    requestId: string,
  ) {
    const alert = await this.alertRepo.findById(hospitalId, alertId);
    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    if (alert.status !== 'CHANGE_REQUIRED' && alert.status !== 'CLINICAL_DISPOSITION_RECORDED') {
      throw new ConflictError(
        `Alert cannot be resolved from status '${alert.status}'. A clinical disposition must be recorded first.`,
      );
    }

    const updated = await this.alertRepo.resolve(hospitalId, alertId, expectedVersion);
    if (!updated) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: doctorUserId,
      action: 'ALERT_RESOLVED',
      resourceType: 'Alert',
      resourceId: alertId,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: updated.version,
    });

    return formatAlert(updated);
  }
}

function formatAlert(alert: AlertDocument) {
  return {
    id: alert._id,
    _id: alert._id,
    ruleId: alert.ruleId,
    ruleVersion: alert.ruleVersion,
    category: alert.category,
    severity: alert.severity,
    status: alert.status,
    rationale: alert.rationale,
    recommendedNextAction: alert.recommendedNextAction,
    limitations: alert.limitations,
    evidenceReferences: alert.evidenceReferences,
    assignedDoctorId: alert.assignedDoctorId || null,
    patientId: alert.patientId,
    subjectId: alert.subjectId,
    subjectVersion: alert.subjectVersion,
    version: alert.version,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
  };
}
