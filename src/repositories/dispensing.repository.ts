import type { Db } from 'mongodb';
import type { DispensingAuthorizationDocument } from '../types/index.js';

export class DispensingRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<DispensingAuthorizationDocument>('dispensing_authorizations');
  }

  async createAuthorization(
    auth: DispensingAuthorizationDocument,
  ): Promise<DispensingAuthorizationDocument> {
    await this.collection.insertOne(auth);
    return auth;
  }

  async findById(hospitalId: string, id: string): Promise<DispensingAuthorizationDocument | null> {
    return this.collection.findOne({ _id: id, hospitalId });
  }

  async findByPrescription(
    hospitalId: string,
    prescriptionId: string,
  ): Promise<DispensingAuthorizationDocument | null> {
    return this.collection.findOne({ hospitalId, prescriptionId });
  }
}
