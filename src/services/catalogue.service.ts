import { CatalogueRepository } from '../repositories/catalogue.repository.js';
import type { MedicineCandidate } from '../schemas/catalogue.schemas.js';
import { NotFoundError } from '../middleware/error-handler.js';
import type { MedicationCatalogItem } from '../domain/medicine-matching/types.js';

export class CatalogueService {
  constructor(private repo: CatalogueRepository) {}

  async search(query: string, limit = 10): Promise<MedicineCandidate[]> {
    const items = await this.repo.searchCatalogue(query, limit);
    return items.map((item) => this.mapToCandidate(item));
  }

  async getById(id: string): Promise<MedicineCandidate> {
    const item = await this.repo.findById(id);
    if (!item) {
      throw new NotFoundError(`Medicine catalogue item '${id}' not found.`);
    }
    return this.mapToCandidate(item);
  }

  private mapToCandidate(item: MedicationCatalogItem): MedicineCandidate {
    const brand = item.brandNames[0] || 'Unknown';
    const strengthStr = item.strengths.map((s) => `${s.value}${s.unit}`).join('/');
    const formStr = item.dosageForms[0] || '';
    const synStr = item.synonyms[0] ? ` (${item.synonyms[0]})` : '';
    const displayName = `${brand} ${strengthStr} ${formStr}${synStr}`.trim();

    return {
      id: item._id,
      displayName,
      canonicalIngredientIds: item.canonicalIngredientIds,
      productType: item.productType,
      strengths: item.strengths,
      dosageForms: item.dosageForms,
      matchStatus: item.status === 'ACTIVE' ? 'CANDIDATE' : 'UNSUPPORTED',
      matchConfidence: 0.9,
    };
  }
}
