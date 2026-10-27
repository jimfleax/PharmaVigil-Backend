/**
 * Domain module: Append-only Audit Trail
 * No update or delete operations permitted.
 */
export interface AuditEventEntry {
  hospitalId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: Date;
  requestId: string;
  reason?: string;
  beforeVersion?: number;
  afterVersion?: number;
  result: 'SUCCESS' | 'FAILURE' | 'REJECTED';
}
