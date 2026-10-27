import type { Db, Filter } from 'mongodb';
import type {
  PrescriptionDocument,
  PrescriptionRevisionDocument,
  PrescriptionStatus,
} from '../types/index.js';

export class PrescriptionRepository {
  constructor(private db: Db) {}

  private get prescriptions() {
    return this.db.collection<PrescriptionDocument>('prescriptions');
  }

  private get revisions() {
    return this.db.collection<PrescriptionRevisionDocument>('prescription_revisions');
  }

  async createPrescription(
    prescription: PrescriptionDocument,
    initialRevision: PrescriptionRevisionDocument,
  ): Promise<PrescriptionDocument> {
    await this.prescriptions.insertOne(prescription);
    await this.revisions.insertOne(initialRevision);
    return prescription;
  }

  async findById(hospitalId: string, id: string): Promise<PrescriptionDocument | null> {
    return this.prescriptions.findOne({ _id: id, hospitalId });
  }

  async list(
    hospitalId: string,
    filter: { patientId?: string; status?: string; cursor?: string; limit: number },
  ): Promise<PrescriptionDocument[]> {
    const query: Filter<PrescriptionDocument> = { hospitalId };
    if (filter.patientId) query.patientId = filter.patientId;
    if (filter.status) query.status = filter.status as PrescriptionStatus;
    if (filter.cursor) query._id = { $gt: filter.cursor };

    return this.prescriptions.find(query).sort({ createdAt: -1 }).limit(filter.limit).toArray();
  }

  async createRevision(
    hospitalId: string,
    prescriptionId: string,
    expectedVersion: number,
    revision: PrescriptionRevisionDocument,
  ): Promise<{
    prescription: PrescriptionDocument;
    revision: PrescriptionRevisionDocument;
  } | null> {
    const updated = await this.prescriptions.findOneAndUpdate(
      { _id: prescriptionId, hospitalId, version: expectedVersion },
      {
        $set: {
          currentRevisionId: revision._id,
          status: 'ACTIVE',
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );

    if (!updated) {
      return null;
    }

    await this.revisions.insertOne(revision);
    return { prescription: updated, revision };
  }

  async getRevisionById(
    hospitalId: string,
    revisionId: string,
  ): Promise<PrescriptionRevisionDocument | null> {
    return this.revisions.findOne({ _id: revisionId, hospitalId });
  }

  async listRevisions(
    hospitalId: string,
    prescriptionId: string,
  ): Promise<PrescriptionRevisionDocument[]> {
    return this.revisions
      .find({ hospitalId, prescriptionId })
      .sort({ revisionNumber: 1 })
      .toArray();
  }

  async updateStatus(
    hospitalId: string,
    id: string,
    expectedVersion: number,
    status: PrescriptionStatus,
  ): Promise<PrescriptionDocument | null> {
    return this.prescriptions.findOneAndUpdate(
      { _id: id, hospitalId, version: expectedVersion },
      {
        $set: {
          status,
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async updateStatusWithoutVersion(
    hospitalId: string,
    id: string,
    status: PrescriptionStatus,
  ): Promise<PrescriptionDocument | null> {
    return this.prescriptions.findOneAndUpdate(
      { _id: id, hospitalId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
  }
}
