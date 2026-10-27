import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { MedicationOrderRepository } from '../repositories/medication-order.repository.js';
import { PatientRepository } from '../repositories/patient.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import type {
  MedicationOrderDocument,
  MedicationOrderVersionDocument,
  PrescriptionItemModel,
} from '../types/index.js';
import { NotFoundError, ConflictError } from '../middleware/error-handler.js';

export class MedicationOrderService {
  private orderRepo: MedicationOrderRepository;
  private patientRepo: PatientRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.orderRepo = new MedicationOrderRepository(db);
    this.patientRepo = new PatientRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async createOrder(
    hospitalId: string,
    patientId: string,
    items: PrescriptionItemModel[],
    notes: string | undefined,
    doctorUserId: string,
    requestId: string,
  ) {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    const orderId = randomUUID();
    const initialVersionId = randomUUID();

    const initialVersion: MedicationOrderVersionDocument = {
      _id: initialVersionId,
      hospitalId,
      orderId,
      versionNumber: 1,
      supersedesVersionId: null,
      items,
      changeReason: 'Initial inpatient medication order',
      checkRunId: null,
      createdBy: doctorUserId,
      createdAt: new Date(),
      version: 1,
    };

    const order: MedicationOrderDocument = {
      _id: orderId,
      hospitalId,
      patientId,
      orderingDoctorId: doctorUserId,
      currentVersionId: initialVersionId,
      currentVersionNumber: 1,
      status: 'ACTIVE',
      notes: notes || null,
      discontinuationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    await this.orderRepo.create(order, initialVersion);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: doctorUserId,
      action: 'MEDICATION_ORDER_CREATED',
      resourceType: 'MedicationOrder',
      resourceId: orderId,
      timestamp: new Date(),
      requestId,
      afterVersion: 1,
      reason: 'Initial inpatient order created',
      metadata: {
        patientId,
        itemCount: items.length,
      },
    });

    return {
      order,
      version: initialVersion,
    };
  }

  async appendVersion(
    hospitalId: string,
    orderId: string,
    expectedVersion: number,
    items: PrescriptionItemModel[],
    changeReason: string,
    doctorUserId: string,
    requestId: string,
  ) {
    const order = await this.orderRepo.findById(hospitalId, orderId);
    if (!order) {
      throw new NotFoundError('Medication order not found');
    }

    if (order.version !== expectedVersion) {
      throw new ConflictError('Medication order version conflict. Reload and review the latest version.');
    }

    const newVersionId = randomUUID();
    const newVersionNumber = order.currentVersionNumber + 1;

    const newVersion: MedicationOrderVersionDocument = {
      _id: newVersionId,
      hospitalId,
      orderId,
      versionNumber: newVersionNumber,
      supersedesVersionId: order.currentVersionId,
      items,
      changeReason,
      checkRunId: null,
      createdBy: doctorUserId,
      createdAt: new Date(),
      version: 1,
    };

    const res = await this.orderRepo.appendVersion(
      hospitalId,
      orderId,
      expectedVersion,
      newVersion,
    );

    if (!res) {
      throw new ConflictError('Concurrent modification detected during version append.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: doctorUserId,
      action: 'MEDICATION_ORDER_VERSION_CREATED',
      resourceType: 'MedicationOrderVersion',
      resourceId: newVersionId,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: res.order.version,
      reason: changeReason,
      metadata: {
        orderId,
        versionNumber: newVersionNumber,
      },
    });

    return res;
  }

  async getOrder(hospitalId: string, orderId: string) {
    const order = await this.orderRepo.findById(hospitalId, orderId);
    if (!order) {
      throw new NotFoundError('Medication order not found');
    }
    const versions = await this.orderRepo.listVersions(hospitalId, orderId);
    return {
      order,
      versions,
    };
  }

  async listOrders(
    hospitalId: string,
    filter: { patientId?: string; status?: string; cursor?: string; limit: number },
  ) {
    return this.orderRepo.list(hospitalId, filter);
  }
}
