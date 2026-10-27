import type { Db, Filter } from 'mongodb';
import type { AuditEventDocument } from '../types/index.js';

export class AuditRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<AuditEventDocument>('audit_events');
  }

  async append(event: AuditEventDocument): Promise<void> {
    await this.collection.insertOne(event);
  }

  async list(
    hospitalId: string,
    filter: { resourceType?: string; actorUserId?: string; cursor?: string; limit: number },
  ): Promise<AuditEventDocument[]> {
    const query: Filter<AuditEventDocument> = { hospitalId };
    if (filter.resourceType) query.resourceType = filter.resourceType;
    if (filter.actorUserId) query.actorUserId = filter.actorUserId;
    if (filter.cursor) query._id = { $gt: filter.cursor };

    return this.collection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(filter.limit)
      .toArray();
  }

  async countByAction(hospitalId: string, action: string): Promise<number> {
    return this.collection.countDocuments({ hospitalId, action });
  }

  async deleteExceptAction(hospitalId: string, preserveAction: string): Promise<void> {
    await this.collection.deleteMany({
      hospitalId,
      action: { $ne: preserveAction },
    });
  }
}
