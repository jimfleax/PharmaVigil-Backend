import type { Db } from 'mongodb';
import type { CheckRunDocument } from '../types/index.js';

export class CheckRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<CheckRunDocument>('check_runs');
  }

  async createCheckRun(checkRun: CheckRunDocument): Promise<CheckRunDocument> {
    await this.collection.insertOne(checkRun);
    return checkRun;
  }

  async findById(hospitalId: string, id: string): Promise<CheckRunDocument | null> {
    return this.collection.findOne({ _id: id, hospitalId });
  }

  async findLatestBySubject(
    hospitalId: string,
    subjectId: string,
  ): Promise<CheckRunDocument | null> {
    const results = await this.collection
      .find({ hospitalId, subjectId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    return results[0] || null;
  }
}
