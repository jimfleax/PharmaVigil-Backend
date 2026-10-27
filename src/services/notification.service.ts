import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { NotificationRepository } from '../repositories/notification.repository.js';
import type { NotificationDocument, NotificationType } from '../types/index.js';
import { NotFoundError } from '../middleware/error-handler.js';

export class NotificationService {
  private notifRepo: NotificationRepository;

  constructor(db: Db) {
    this.notifRepo = new NotificationRepository(db);
  }

  async listNotifications(
    hospitalId: string,
    recipientUserId: string,
    unreadOnly = false,
    cursor?: string,
    limit = 20,
  ): Promise<NotificationDocument[]> {
    return this.notifRepo.listByUser(hospitalId, recipientUserId, unreadOnly, cursor, limit);
  }

  async markAsRead(
    hospitalId: string,
    notificationId: string,
    recipientUserId: string,
  ): Promise<void> {
    const success = await this.notifRepo.markRead(hospitalId, notificationId, recipientUserId);
    if (!success) {
      throw new NotFoundError('Notification not found or access denied');
    }
  }

  async dispatchNotification(
    hospitalId: string,
    recipientUserId: string,
    type: NotificationType,
    subjectId: string,
    title: string,
    message: string,
  ): Promise<NotificationDocument> {
    const doc: NotificationDocument = {
      _id: randomUUID(),
      hospitalId,
      recipientUserId,
      type,
      subjectId,
      title,
      message,
      read: false,
      readAt: null,
      createdAt: new Date(),
      version: 1,
    };
    return this.notifRepo.create(doc);
  }

  async dispatchMany(
    notifications: Array<{
      hospitalId: string;
      recipientUserId: string;
      type: NotificationType;
      subjectId: string;
      title: string;
      message: string;
    }>,
  ): Promise<void> {
    if (notifications.length === 0) return;
    const docs: NotificationDocument[] = notifications.map((n) => ({
      _id: randomUUID(),
      hospitalId: n.hospitalId,
      recipientUserId: n.recipientUserId,
      type: n.type,
      subjectId: n.subjectId,
      title: n.title,
      message: n.message,
      read: false,
      readAt: null,
      createdAt: new Date(),
      version: 1,
    }));
    await this.notifRepo.createMany(docs);
  }
}
