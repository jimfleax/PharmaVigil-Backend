import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { RuleSetRepository } from '../repositories/rule-set.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import type { ClinicalRuleSetDocument, RuleSetMetadata } from '../types/index.js';
import type { CreateRuleSetDraftInput, ListRuleSetsQuery } from '../schemas/rule-set.schemas.js';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/error-handler.js';

export class RuleGovernanceService {
  private ruleRepo: RuleSetRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.ruleRepo = new RuleSetRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async getCurrentMetadata(): Promise<RuleSetMetadata> {
    const current = await this.ruleRepo.getCurrentRuleSet();
    if (!current) {
      return {
        ruleSetId: 'FALLBACK-RULES',
        version: '1.0.0-DEMO',
        description: 'Illustrative demonstration ruleset fallback',
        status: 'ILLUSTRATIVE_NOT_VALIDATED',
        ruleCount: 0,
        isClinicallyValidated: false,
        limitations: ['Synthetic demonstration fixture', 'Not clinically validated'],
      };
    }

    const publishedAtStr = current.publishedAt
      ? current.publishedAt instanceof Date
        ? current.publishedAt.toISOString()
        : new Date(current.publishedAt).toISOString()
      : undefined;

    return {
      ruleSetId: current.ruleSetId,
      version: current.version,
      description: current.description || 'Illustrative clinical demonstration rules',
      status: current.status,
      ruleCount: current.rules ? current.rules.length : 0,
      isClinicallyValidated: current.isClinicallyValidated ?? false,
      limitations: current.limitations || [],
      publishedAt: publishedAtStr,
    };
  }

  async listRuleSets(query: ListRuleSetsQuery): Promise<ClinicalRuleSetDocument[]> {
    const filter: { status?: string; limit: number } = { limit: query.limit };
    if (query.status) filter.status = query.status;
    return this.ruleRepo.list(filter);
  }

  async createDraft(
    input: CreateRuleSetDraftInput,
    authorUserId: string,
    requestId: string,
  ): Promise<ClinicalRuleSetDocument> {
    const existing = await this.ruleRepo.findByVersion(input.version);
    if (existing) {
      throw new ConflictError(`Rule set version ${input.version} already exists.`);
    }

    const doc: ClinicalRuleSetDocument = {
      _id: randomUUID(),
      ruleSetId: input.ruleSetId,
      version: input.version,
      description: input.description,
      status: 'DRAFT',
      rules: input.rules,
      limitations: input.limitations || [],
      authorUserId,
      reviewerUserId: null,
      reviewRationale: null,
      reviewedAt: null,
      publisherUserId: null,
      publishedAt: null,
      isClinicallyValidated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.ruleRepo.create(doc);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId: 'SYSTEM',
      actorUserId: authorUserId,
      action: 'RULE_SET_DRAFT_CREATED',
      resourceType: 'ClinicalRuleSet',
      resourceId: doc._id,
      timestamp: new Date(),
      requestId,
      afterVersion: 1,
      reason: 'Draft rule set created',
      metadata: {
        ruleSetId: input.ruleSetId,
        version: input.version,
        ruleCount: input.rules.length,
      },
    });

    return doc;
  }

  async submitForReview(
    ruleSetId: string,
    actorUserId: string,
    requestId: string,
  ): Promise<ClinicalRuleSetDocument> {
    const existing = await this.ruleRepo.findById(ruleSetId);
    if (!existing) {
      throw new NotFoundError('Rule set not found');
    }

    if (existing.status !== 'DRAFT') {
      throw new ConflictError(
        `Cannot submit for review: rule set is in ${existing.status} status. Only DRAFT can be submitted.`,
      );
    }

    if (!existing.rules || existing.rules.length === 0) {
      throw new ValidationError('Rule set must contain at least 1 rule before review submission.');
    }

    const updated = await this.ruleRepo.updateLifecycle(existing._id, 'DRAFT', 'IN_REVIEW', {});
    if (!updated) {
      throw new ConflictError('Concurrent state conflict during review submission.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId: 'SYSTEM',
      actorUserId,
      action: 'RULE_SET_SUBMITTED_FOR_REVIEW',
      resourceType: 'ClinicalRuleSet',
      resourceId: existing._id,
      timestamp: new Date(),
      requestId,
      reason: 'Rule set submitted for qualified clinical review',
      metadata: {
        ruleSetVersion: existing.version,
      },
    });

    return updated;
  }

  async approve(
    ruleSetId: string,
    rationale: string,
    reviewerUserId: string,
    requestId: string,
  ): Promise<ClinicalRuleSetDocument> {
    const existing = await this.ruleRepo.findById(ruleSetId);
    if (!existing) {
      throw new NotFoundError('Rule set not found');
    }

    if (existing.status !== 'IN_REVIEW') {
      throw new ConflictError(
        `Cannot approve: rule set is in ${existing.status} status. Only IN_REVIEW rule sets can be approved.`,
      );
    }

    const updated = await this.ruleRepo.updateLifecycle(existing._id, 'IN_REVIEW', 'APPROVED', {
      reviewerUserId,
      reviewRationale: rationale,
      reviewedAt: new Date(),
    });

    if (!updated) {
      throw new ConflictError('Concurrent state conflict during rule set approval.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId: 'SYSTEM',
      actorUserId: reviewerUserId,
      action: 'RULE_SET_APPROVED',
      resourceType: 'ClinicalRuleSet',
      resourceId: existing._id,
      timestamp: new Date(),
      requestId,
      reason: rationale,
      metadata: {
        reviewerUserId,
        ruleSetVersion: existing.version,
      },
    });

    return updated;
  }

  async publish(
    ruleSetId: string,
    publisherUserId: string,
    requestId: string,
  ): Promise<ClinicalRuleSetDocument> {
    const existing = await this.ruleRepo.findById(ruleSetId);
    if (!existing) {
      throw new NotFoundError('Rule set not found');
    }

    if (existing.status !== 'APPROVED') {
      throw new ConflictError(
        `Cannot publish: rule set is in ${existing.status} status. Only APPROVED rule sets can be published.`,
      );
    }

    // Retire any previously published rule sets
    await this.ruleRepo.retirePublished(existing._id);

    const updated = await this.ruleRepo.updateLifecycle(existing._id, 'APPROVED', 'PUBLISHED', {
      publisherUserId,
      publishedAt: new Date(),
      isClinicallyValidated: true,
    });

    if (!updated) {
      throw new ConflictError('Concurrent state conflict during rule set publishing.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId: 'SYSTEM',
      actorUserId: publisherUserId,
      action: 'RULE_SET_PUBLISHED',
      resourceType: 'ClinicalRuleSet',
      resourceId: existing._id,
      timestamp: new Date(),
      requestId,
      reason: 'Rule set published as authoritative immutable ruleset snapshot',
      metadata: {
        ruleSetVersion: existing.version,
        publishedAt: updated.publishedAt,
      },
    });

    return updated;
  }
}
