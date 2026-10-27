import type { Db } from 'mongodb';
import type { PatientRecordDocument } from '../types/index.js';

export class PatientRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<PatientRecordDocument>('patient_records');
  }

  async findById(hospitalId: string, patientId: string): Promise<PatientRecordDocument | null> {
    return this.collection.findOne({ _id: patientId, hospitalId });
  }

  async findBySyntheticId(
    hospitalId: string,
    syntheticHospitalPatientId: string,
  ): Promise<PatientRecordDocument[]> {
    return this.collection
      .find({
        hospitalId,
        syntheticHospitalPatientId: { $regex: `^${syntheticHospitalPatientId}`, $options: 'i' },
      })
      .toArray();
  }

  async findByLinkedUserId(
    hospitalId: string,
    linkedUserId: string,
  ): Promise<PatientRecordDocument | null> {
    return this.collection.findOne({ hospitalId, linkedUserId });
  }

  async confirmLink(
    hospitalId: string,
    patientId: string,
    userId: string,
    expectedVersion: number,
  ): Promise<PatientRecordDocument | null> {
    return this.collection.findOneAndUpdate(
      { _id: patientId, hospitalId, version: expectedVersion },
      {
        $set: {
          linkedUserId: userId,
          linkStatus: 'LINKED',
          updatedAt: new Date(),
          version: expectedVersion + 1,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async create(patient: PatientRecordDocument): Promise<PatientRecordDocument> {
    await this.collection.insertOne(patient);
    return patient;
  }
}
