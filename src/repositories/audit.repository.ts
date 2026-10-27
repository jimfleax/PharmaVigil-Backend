import type { Db } from 'mongodb';
import type { AuditEventDocument } from '../types/index.js';

export class AuditRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<AuditEventDocument>('audit_events');
  }

  async append(event: AuditEventDocument): Promise<void> {
    await this.collection.insertOne(event);
  }
}
