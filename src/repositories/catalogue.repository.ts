import type { Db } from 'mongodb';
import type { MedicationCatalogItem } from '../domain/medicine-matching/types.js';
import { SYNTHETIC_CATALOGUE_ITEMS } from '../fixtures/seed-catalogue-rules.js';

export class CatalogueRepository {
  private collectionName = 'medication_catalog';

  constructor(private db: Db) {}

  /**
   * Search catalogue items by brand name, synonym, or partial string.
   */
  async searchCatalogue(query: string, limit = 10): Promise<MedicationCatalogItem[]> {
    const coll = this.db.collection<MedicationCatalogItem>(this.collectionName);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const results = await coll
      .find({
        status: 'ACTIVE',
        $or: [{ brandNames: regex }, { synonyms: regex }],
      })
      .limit(limit)
      .toArray();

    return results;
  }

  /**
   * Find a specific catalogue item by ID.
   */
  async findById(id: string): Promise<MedicationCatalogItem | null> {
    const coll = this.db.collection<MedicationCatalogItem>(this.collectionName);
    return coll.findOne({ _id: id });
  }

  /**
   * Seed demo synthetic catalogue items into MongoDB if empty.
   */
  async seedCatalogue(): Promise<void> {
    const coll = this.db.collection<MedicationCatalogItem>(this.collectionName);
    const count = await coll.countDocuments();
    if (count === 0) {
      await coll.insertMany(SYNTHETIC_CATALOGUE_ITEMS);
    }
  }
}
