import type { Db } from 'mongodb';
import type { IdempotencyRecordDocument } from '../types/index.js';

export class IdempotencyRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<IdempotencyRecordDocument>('idempotency_records');
  }

  async findByKey(
    hospitalId: string,
    actorUserId: string,
    operation: string,
    key: string,
  ): Promise<IdempotencyRecordDocument | null> {
    return this.collection.findOne({
      hospitalId,
      actorUserId,
      operation,
      key,
    });
  }

  async save(record: IdempotencyRecordDocument): Promise<void> {
    await this.collection.updateOne(
      {
        hospitalId: record.hospitalId,
        actorUserId: record.actorUserId,
        operation: record.operation,
        key: record.key,
      },
      { $set: record },
      { upsert: true },
    );
  }
}
