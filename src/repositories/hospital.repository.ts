import type { Db } from 'mongodb';
import type { HospitalDocument } from '../types/index.js';

export class HospitalRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<HospitalDocument>('hospitals');
  }

  async findById(id: string): Promise<HospitalDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  async findBySlug(slug: string): Promise<HospitalDocument | null> {
    return this.collection.findOne({ slug });
  }

  async create(hospital: HospitalDocument): Promise<HospitalDocument> {
    await this.collection.insertOne(hospital);
    return hospital;
  }
}
