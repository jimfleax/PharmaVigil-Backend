import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { CatalogueSearchQuerySchema } from '../schemas/catalogue.schemas.js';
import { CatalogueRepository } from '../repositories/catalogue.repository.js';
import { CatalogueService } from '../services/catalogue.service.js';
import { getDatabase } from '../config/db.js';
import { ForbiddenError, UnauthenticatedError } from '../middleware/error-handler.js';

export const catalogueRoutes = new Hono<{ Variables: AppVariables }>();

function getService(): CatalogueService {
  const db = getDatabase();
  const repo = new CatalogueRepository(db);
  return new CatalogueService(repo);
}

// API-MED-001: GET /medicine-catalogue/search
catalogueRoutes.get(
  '/search',
  zValidator('query', CatalogueSearchQuerySchema),
  async (c) => {
    const membership = c.get('membership');
    const user = c.get('user');

    // Authentication & authorization checks
    if (!user) {
      throw new UnauthenticatedError('Authentication required to search catalogue.');
    }

    if (!membership || !['DOCTOR', 'PHARMACIST'].includes(membership.role)) {
      throw new ForbiddenError('Access forbidden: Only DOCTOR or PHARMACIST may search catalogue.');
    }

    const { query, limit } = c.req.valid('query');
    const service = getService();
    const data = await service.search(query, limit);

    return c.json({ data });
  },
);

// API-MED-002: GET /medicine-catalogue/:itemId
catalogueRoutes.get('/:itemId', async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new UnauthenticatedError('Authentication required to view catalogue item.');
  }

  const itemId = c.req.param('itemId');
  const service = getService();
  const data = await service.getById(itemId);

  return c.json(data);
});
