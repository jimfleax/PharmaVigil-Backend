import type { Db, Collection, Filter } from 'mongodb';
import type {
  MedicationOrderDocument,
  MedicationOrderVersionDocument,
  MedicationOrderStatus,
} from '../types/index.js';

export class MedicationOrderRepository {
  private orders: Collection<MedicationOrderDocument>;
  private versions: Collection<MedicationOrderVersionDocument>;

  constructor(db: Db) {
    this.orders = db.collection<MedicationOrderDocument>('medication_orders');
    this.versions = db.collection<MedicationOrderVersionDocument>('medication_order_versions');
  }

  async create(
    order: MedicationOrderDocument,
    initialVersion: MedicationOrderVersionDocument,
  ): Promise<{ order: MedicationOrderDocument; version: MedicationOrderVersionDocument }> {
    await this.orders.insertOne(order);
    await this.versions.insertOne(initialVersion);
    return { order, version: initialVersion };
  }

  async findById(hospitalId: string, orderId: string): Promise<MedicationOrderDocument | null> {
    return this.orders.findOne({ _id: orderId, hospitalId });
  }

  async findVersionById(
    hospitalId: string,
    versionId: string,
  ): Promise<MedicationOrderVersionDocument | null> {
    return this.versions.findOne({ _id: versionId, hospitalId });
  }

  async listVersions(
    hospitalId: string,
    orderId: string,
  ): Promise<MedicationOrderVersionDocument[]> {
    return this.versions.find({ hospitalId, orderId }).sort({ versionNumber: -1 }).toArray();
  }

  async list(
    hospitalId: string,
    filter: { patientId?: string; status?: string; cursor?: string; limit: number },
  ): Promise<MedicationOrderDocument[]> {
    const query: Filter<MedicationOrderDocument> = { hospitalId };
    if (filter.patientId) query.patientId = filter.patientId;
    if (filter.status) query.status = filter.status as MedicationOrderStatus;
    if (filter.cursor) query._id = { $gt: filter.cursor };

    return this.orders.find(query).sort({ createdAt: -1 }).limit(filter.limit).toArray();
  }

  async appendVersion(
    hospitalId: string,
    orderId: string,
    expectedVersion: number,
    newVersion: MedicationOrderVersionDocument,
  ): Promise<{ order: MedicationOrderDocument; version: MedicationOrderVersionDocument } | null> {
    const updatedOrder = await this.orders.findOneAndUpdate(
      { _id: orderId, hospitalId, version: expectedVersion },
      {
        $set: {
          currentVersionId: newVersion._id,
          currentVersionNumber: newVersion.versionNumber,
          updatedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { returnDocument: 'after' },
    );

    if (!updatedOrder) {
      return null;
    }

    await this.versions.insertOne(newVersion);
    return { order: updatedOrder, version: newVersion };
  }

  async linkCheckRun(hospitalId: string, versionId: string, checkRunId: string): Promise<boolean> {
    const res = await this.versions.updateOne(
      { _id: versionId, hospitalId },
      { $set: { checkRunId } },
    );
    return res.matchedCount > 0;
  }
}
