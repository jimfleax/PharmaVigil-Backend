import type { Db } from 'mongodb';
import type { PatientAllergyDocument } from '../types/index.js';

export class AllergyRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<PatientAllergyDocument>('patient_allergies');
  }

  async listByPatient(hospitalId: string, patientId: string): Promise<PatientAllergyDocument[]> {
    return this.collection.find({ hospitalId, patientId }).toArray();
  }

  async create(allergy: PatientAllergyDocument): Promise<PatientAllergyDocument> {
    await this.collection.insertOne(allergy);
    return allergy;
  }
}
