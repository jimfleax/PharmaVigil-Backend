import type { Db, Collection, Filter } from 'mongodb';
import type { NotificationDocument } from '../types/index.js';

export class NotificationRepository {
  private collection: Collection<NotificationDocument>;

  constructor(db: Db) {
    this.collection = db.collection<NotificationDocument>('notifications');
  }

  async create(doc: NotificationDocument): Promise<NotificationDocument> {
    await this.collection.insertOne(doc);
    return doc;
  }

  async createMany(docs: NotificationDocument[]): Promise<void> {
    if (docs.length === 0) return;
    await this.collection.insertMany(docs);
  }

  async findById(hospitalId: string, notificationId: string): Promise<NotificationDocument | null> {
    return this.collection.findOne({ _id: notificationId, hospitalId });
  }

  async listByUser(
    hospitalId: string,
    recipientUserId: string,
    unreadOnly = false,
    cursor?: string,
    limit = 20,
  ): Promise<NotificationDocument[]> {
    const query: Filter<NotificationDocument> = { hospitalId, recipientUserId };
    if (unreadOnly) {
      query.read = false;
    }
    if (cursor) {
      query._id = { $gt: cursor };
    }

    return this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async markRead(
    hospitalId: string,
    notificationId: string,
    recipientUserId: string,
  ): Promise<boolean> {
    const res = await this.collection.updateOne(
      { _id: notificationId, hospitalId, recipientUserId },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
        $inc: { version: 1 },
      },
    );
    return res.matchedCount > 0;
  }
}
