import type { Db } from 'mongodb';
import type { SessionDocument } from '../types/index.js';

export class SessionRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<SessionDocument>('sessions');
  }

  async findById(id: string): Promise<SessionDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  async create(session: SessionDocument): Promise<SessionDocument> {
    await this.collection.insertOne(session);
    return session;
  }

  async touchIdle(id: string, newIdleExpiresAt: Date): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      { $set: { lastSeenAt: new Date(), idleExpiresAt: newIdleExpiresAt } },
    );
  }

  async revoke(
    id: string,
    reason: 'LOGOUT' | 'SECURITY_REVOCATION' | 'SUSPENDED_USER',
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      { $set: { revokedAt: new Date(), revocationReason: reason } },
    );
  }
}
