import type { Db } from 'mongodb';
import type { PatientMedicationHistoryDocument } from '../types/index.js';

export class MedicationHistoryRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<PatientMedicationHistoryDocument>('patient_medication_history');
  }

  async listByPatient(
    hospitalId: string,
    patientId: string,
  ): Promise<PatientMedicationHistoryDocument[]> {
    return this.collection.find({ hospitalId, patientId }).toArray();
  }

  async create(item: PatientMedicationHistoryDocument): Promise<PatientMedicationHistoryDocument> {
    await this.collection.insertOne(item);
    return item;
  }
}
