import type { Db } from 'mongodb';
import { AuditRepository } from '../repositories/audit.repository.js';
import type { AuditEventDocument } from '../types/index.js';

export class AuditService {
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.auditRepo = new AuditRepository(db);
  }

  async listEvents(
    hospitalId: string,
    filter: { resourceType?: string; actorUserId?: string; cursor?: string; limit: number },
  ): Promise<AuditEventDocument[]> {
    return this.auditRepo.list(hospitalId, filter);
  }
}
