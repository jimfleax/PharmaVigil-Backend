import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { RuleGovernanceService } from '../services/rule-governance.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import {
  CreateRuleSetDraftSchema,
  ApproveRuleSetSchema,
  ListRuleSetsQuerySchema,
} from '../schemas/rule-set.schemas.js';

export const rulesRoutes = new Hono<{ Variables: AppVariables }>();

// API-RULE-001: GET /rule-sets/current
rulesRoutes.get('/current', requireAuth, requireMembership, async (c) => {
  const service = new RuleGovernanceService(getDatabase());
  const data = await service.getCurrentMetadata();
  return c.json({ data });
});

// API-RULE-002: GET /rule-sets
rulesRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN'),
  zValidator('query', ListRuleSetsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const service = new RuleGovernanceService(getDatabase());
    const data = await service.listRuleSets(query);
    return c.json({ data });
  },
);

// API-RULE-003: POST /rule-sets
rulesRoutes.post(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN'),
  zValidator('json', CreateRuleSetDraftSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const input = c.req.valid('json');

    const service = new RuleGovernanceService(getDatabase());
    const data = await service.createDraft(input, user.userId, requestId);

    return c.json({ data }, 201);
  },
);

// API-RULE-004: POST /rule-sets/:id/submit-review
rulesRoutes.post(
  '/:id/submit-review',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN'),
  async (c) => {
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const ruleSetId = c.req.param('id');

    const service = new RuleGovernanceService(getDatabase());
    const data = await service.submitForReview(ruleSetId, user.userId, requestId);

    return c.json({ data });
  },
);

// API-RULE-005: POST /rule-sets/:id/approve
rulesRoutes.post(
  '/:id/approve',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN'),
  zValidator('json', ApproveRuleSetSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const ruleSetId = c.req.param('id');
    const { rationale } = c.req.valid('json');

    const service = new RuleGovernanceService(getDatabase());
    const data = await service.approve(ruleSetId, rationale, user.userId, requestId);

    return c.json({ data });
  },
);

// API-RULE-006: POST /rule-sets/:id/publish
rulesRoutes.post(
  '/:id/publish',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN'),
  async (c) => {
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const ruleSetId = c.req.param('id');

    const service = new RuleGovernanceService(getDatabase());
    const data = await service.publish(ruleSetId, user.userId, requestId);

    return c.json({ data });
  },
);
