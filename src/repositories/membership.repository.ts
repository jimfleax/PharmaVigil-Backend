import type { Db } from 'mongodb';
import type { MembershipDocument, MembershipStatus } from '../types/index.js';

export class MembershipRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<MembershipDocument>('memberships');
  }

  async findById(hospitalId: string, membershipId: string): Promise<MembershipDocument | null> {
    return this.collection.findOne({ _id: membershipId, hospitalId });
  }

  async findByUserAndHospital(
    userId: string,
    hospitalId: string,
  ): Promise<MembershipDocument | null> {
    return this.collection.findOne({ userId, hospitalId });
  }

  async listByHospital(
    hospitalId: string,
    filter: { status?: MembershipStatus; limit?: number },
  ): Promise<MembershipDocument[]> {
    const query: Record<string, unknown> = { hospitalId };
    if (filter.status) {
      query.status = filter.status;
    }
    return this.collection
      .find(query)
      .sort({ requestedAt: -1 })
      .limit(filter.limit || 50)
      .toArray();
  }

  async listByUser(userId: string): Promise<MembershipDocument[]> {
    return this.collection.find({ userId }).toArray();
  }

  async create(membership: MembershipDocument): Promise<MembershipDocument> {
    await this.collection.insertOne(membership);
    return membership;
  }

  async updateStatusWithVersion(
    hospitalId: string,
    membershipId: string,
    expectedVersion: number,
    updates: Partial<MembershipDocument>,
  ): Promise<MembershipDocument | null> {
    const res = await this.collection.findOneAndUpdate(
      { _id: membershipId, hospitalId, version: expectedVersion },
      {
        $set: {
          ...updates,
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );
    return res;
  }
}
