import type { Db } from 'mongodb';
import type { UserDocument } from '../types/index.js';

export class UserRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<UserDocument>('users');
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  async findByEmailNormalized(emailNormalized: string): Promise<UserDocument | null> {
    return this.collection.findOne({ emailNormalized });
  }

  async create(user: UserDocument): Promise<UserDocument> {
    await this.collection.insertOne(user);
    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } },
    );
  }
}
