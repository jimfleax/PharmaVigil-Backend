import type { Db } from 'mongodb';
import type { PrescriptionCaptureDocument, PrescriptionItemModel } from '../types/index.js';

export class CaptureRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<PrescriptionCaptureDocument>('prescription_captures');
  }

  async create(capture: PrescriptionCaptureDocument): Promise<PrescriptionCaptureDocument> {
    await this.collection.insertOne(capture);
    return capture;
  }

  async findById(hospitalId: string, id: string): Promise<PrescriptionCaptureDocument | null> {
    return this.collection.findOne({ _id: id, hospitalId });
  }

  async updateDraft(
    hospitalId: string,
    id: string,
    expectedVersion: number,
    updates: Partial<PrescriptionCaptureDocument>,
  ): Promise<PrescriptionCaptureDocument | null> {
    return this.collection.findOneAndUpdate(
      { _id: id, hospitalId, version: expectedVersion },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async confirmCapture(
    hospitalId: string,
    id: string,
    expectedVersion: number,
    items: PrescriptionItemModel[],
  ): Promise<PrescriptionCaptureDocument | null> {
    return this.collection.findOneAndUpdate(
      { _id: id, hospitalId, version: expectedVersion },
      {
        $set: {
          items,
          status: 'CONFIRMED',
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );
  }
}
