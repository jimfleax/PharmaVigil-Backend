import type { Db, Filter } from 'mongodb';
import type { AlertDocument, AlertDispositionDocument, AlertStatus } from '../types/index.js';

export class AlertRepository {
  constructor(private db: Db) {}

  private get alerts() {
    return this.db.collection<AlertDocument>('alerts');
  }

  private get dispositions() {
    return this.db.collection<AlertDispositionDocument>('alert_dispositions');
  }

  async createMany(alerts: AlertDocument[]): Promise<void> {
    if (alerts.length > 0) {
      await this.alerts.insertMany(alerts);
    }
  }

  async findById(hospitalId: string, alertId: string): Promise<AlertDocument | null> {
    return this.alerts.findOne({ _id: alertId, hospitalId });
  }

  async findByCheckId(hospitalId: string, checkId: string): Promise<AlertDocument[]> {
    return this.alerts.find({ hospitalId, checkId }).toArray();
  }

  async findBySubject(
    hospitalId: string,
    subjectType: 'PRESCRIPTION_REVISION' | 'MEDICATION_ORDER_VERSION',
    subjectId: string,
  ): Promise<AlertDocument[]> {
    return this.alerts.find({ hospitalId, subjectType, subjectId }).toArray();
  }

  async list(
    hospitalId: string,
    filter: { status?: AlertStatus; assignedDoctorId?: string; cursor?: string; limit: number },
  ): Promise<AlertDocument[]> {
    const query: Filter<AlertDocument> = { hospitalId };
    if (filter.status) query.status = filter.status;
    if (filter.assignedDoctorId) query.assignedDoctorId = filter.assignedDoctorId;
    if (filter.cursor) query._id = { $gt: filter.cursor };

    return this.alerts.find(query).sort({ createdAt: -1 }).limit(filter.limit).toArray();
  }

  async acknowledge(
    hospitalId: string,
    alertId: string,
    expectedVersion: number,
    doctorId: string,
  ): Promise<AlertDocument | null> {
    return this.alerts.findOneAndUpdate(
      { _id: alertId, hospitalId, version: expectedVersion },
      {
        $set: {
          status: 'ACKNOWLEDGED',
          assignedDoctorId: doctorId,
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async recordDisposition(
    hospitalId: string,
    alertId: string,
    expectedVersion: number,
    disposition: AlertDispositionDocument,
    newStatus: AlertStatus,
  ): Promise<AlertDocument | null> {
    const updated = await this.alerts.findOneAndUpdate(
      { _id: alertId, hospitalId, version: expectedVersion },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );

    if (!updated) {
      return null;
    }

    await this.dispositions.insertOne(disposition);
    return updated;
  }

  async resolve(
    hospitalId: string,
    alertId: string,
    expectedVersion: number,
  ): Promise<AlertDocument | null> {
    return this.alerts.findOneAndUpdate(
      { _id: alertId, hospitalId, version: expectedVersion },
      {
        $set: {
          status: 'RESOLVED',
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async findDispositionsByAlertId(
    hospitalId: string,
    alertId: string,
  ): Promise<AlertDispositionDocument[]> {
    return this.dispositions.find({ hospitalId, alertId }).sort({ recordedAt: -1 }).toArray();
  }
}
