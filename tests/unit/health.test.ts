import { describe, it, expect, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { closeDatabaseConnection } from '../../src/config/db.js';

describe('Health API endpoints', () => {
  afterAll(async () => {
    await closeDatabaseConnection();
  });
  it('GET /api/v1/health/live returns 200 with status ok and timestamp', async () => {
    const res = await app.request('/api/v1/health/live');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('GET /api/v1/health/ready returns 200 ok when MongoDB Atlas is connected', async () => {
    const res = await app.request('/api/v1/health/ready');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
  });

  it('GET /api/v1/unknown returns standard 404 error envelope', async () => {
    const res = await app.request('/api/v1/nonexistent');
    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: { code: string; message: string; requestId: string } };
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeDefined();
  });
});
