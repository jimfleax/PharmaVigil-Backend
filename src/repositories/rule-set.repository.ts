import type { Db, Collection, Filter } from 'mongodb';
import type { ClinicalRuleSetDocument } from '../types/index.js';

export class RuleSetRepository {
  private collection: Collection<ClinicalRuleSetDocument>;

  constructor(db: Db) {
    this.collection = db.collection<ClinicalRuleSetDocument>('rule_sets');
  }

  async getCurrentRuleSet(): Promise<ClinicalRuleSetDocument | null> {
    const published = await this.collection.findOne(
      { status: 'PUBLISHED' },
      { sort: { publishedAt: -1, createdAt: -1 } },
    );
    if (published) return published;

    return this.collection.findOne(
      { status: 'ILLUSTRATIVE_NOT_VALIDATED' },
      { sort: { createdAt: -1 } },
    );
  }

  async findById(idOrRuleSetId: string): Promise<ClinicalRuleSetDocument | null> {
    return this.collection.findOne({
      $or: [{ _id: idOrRuleSetId }, { ruleSetId: idOrRuleSetId }],
    });
  }

  async findByVersion(version: string): Promise<ClinicalRuleSetDocument | null> {
    return this.collection.findOne({ version });
  }

  async list(filter: { status?: string; limit: number }): Promise<ClinicalRuleSetDocument[]> {
    const query: Filter<ClinicalRuleSetDocument> = {};
    if (filter.status) {
      query.status = filter.status as ClinicalRuleSetDocument['status'];
    }

    return this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filter.limit)
      .toArray();
  }

  async create(doc: ClinicalRuleSetDocument): Promise<ClinicalRuleSetDocument> {
    await this.collection.insertOne(doc);
    return doc;
  }

  async updateLifecycle(
    id: string,
    expectedStatus: string,
    newStatus: ClinicalRuleSetDocument['status'],
    updates: Partial<ClinicalRuleSetDocument>,
  ): Promise<ClinicalRuleSetDocument | null> {
    return this.collection.findOneAndUpdate(
      {
        $or: [{ _id: id }, { ruleSetId: id }],
        status: expectedStatus as ClinicalRuleSetDocument['status'],
      },
      {
        $set: {
          ...updates,
          status: newStatus,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
  }

  async retirePublished(exceptId: string): Promise<void> {
    await this.collection.updateMany(
      {
        _id: { $ne: exceptId },
        ruleSetId: { $ne: exceptId },
        status: 'PUBLISHED',
      },
      {
        $set: {
          status: 'RETIRED',
          updatedAt: new Date(),
        },
      },
    );
  }
}
