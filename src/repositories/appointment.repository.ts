import type { Db, Collection, Filter } from 'mongodb';
import type { AppointmentDocument } from '../types/index.js';

export class AppointmentRepository {
  private collection: Collection<AppointmentDocument>;

  constructor(db: Db) {
    this.collection = db.collection<AppointmentDocument>('appointments');
  }

  async create(doc: AppointmentDocument): Promise<AppointmentDocument> {
    await this.collection.insertOne(doc);
    return doc;
  }

  async findById(hospitalId: string, appointmentId: string): Promise<AppointmentDocument | null> {
    return this.collection.findOne({ _id: appointmentId, hospitalId });
  }

  async findConflicting(
    hospitalId: string,
    criteria: {
      doctorUserId?: string;
      patientId?: string;
      startAt: Date;
      endAt: Date;
      excludeAppointmentId?: string;
    },
  ): Promise<AppointmentDocument | null> {
    const orConditions: Filter<AppointmentDocument>[] = [];
    if (criteria.doctorUserId) {
      orConditions.push({ doctorUserId: criteria.doctorUserId });
    }
    if (criteria.patientId) {
      orConditions.push({ patientId: criteria.patientId });
    }
    if (orConditions.length === 0) return null;

    const filter: Filter<AppointmentDocument> = {
      hospitalId,
      status: 'BOOKED',
      $or: orConditions,
      startAt: { $lt: criteria.endAt },
      endAt: { $gt: criteria.startAt },
    };

    if (criteria.excludeAppointmentId) {
      filter._id = { $ne: criteria.excludeAppointmentId };
    }

    return this.collection.findOne(filter);
  }

  async list(
    hospitalId: string,
    filter: {
      from?: Date;
      to?: Date;
      patientId?: string;
      doctorUserId?: string;
      cursor?: string;
      limit: number;
    },
  ): Promise<AppointmentDocument[]> {
    const query: Filter<AppointmentDocument> = { hospitalId };

    if (filter.patientId) query.patientId = filter.patientId;
    if (filter.doctorUserId) query.doctorUserId = filter.doctorUserId;

    if (filter.from || filter.to) {
      const dateFilter: Filter<Date> = {};
      if (filter.from) dateFilter.$gte = filter.from;
      if (filter.to) dateFilter.$lte = filter.to;
      query.startAt = dateFilter;
    }

    if (filter.cursor) query._id = { $gt: filter.cursor };

    return this.collection
      .find(query)
      .sort({ startAt: 1 })
      .limit(filter.limit)
      .toArray();
  }

  async cancel(
    hospitalId: string,
    appointmentId: string,
    expectedVersion: number | undefined,
    cancelledBy: string,
    cancellationReason?: string,
  ): Promise<AppointmentDocument | null> {
    const query: Filter<AppointmentDocument> = { _id: appointmentId, hospitalId };
    if (expectedVersion !== undefined) {
      query.version = expectedVersion;
    }

    return this.collection.findOneAndUpdate(
      query,
      {
        $set: {
          status: 'CANCELLED',
          cancelledBy,
          cancellationReason: cancellationReason || null,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { returnDocument: 'after' },
    );
  }
}
