import { describe, it, expect } from 'vitest';

function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

describe('Appointment Interval Overlap Math', () => {
  const baseStart = new Date('2026-10-30T10:00:00Z');
  const baseEnd = new Date('2026-10-30T11:00:00Z');

  it('detects exact same interval collision', () => {
    const aStart = new Date('2026-10-30T10:00:00Z');
    const aEnd = new Date('2026-10-30T11:00:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(true);
  });

  it('detects partial overlap on the left', () => {
    const aStart = new Date('2026-10-30T09:30:00Z');
    const aEnd = new Date('2026-10-30T10:30:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(true);
  });

  it('detects partial overlap on the right', () => {
    const aStart = new Date('2026-10-30T10:30:00Z');
    const aEnd = new Date('2026-10-30T11:30:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(true);
  });

  it('detects sub-interval completely inside base', () => {
    const aStart = new Date('2026-10-30T10:15:00Z');
    const aEnd = new Date('2026-10-30T10:45:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(true);
  });

  it('detects enclosing interval containing base', () => {
    const aStart = new Date('2026-10-30T09:00:00Z');
    const aEnd = new Date('2026-10-30T12:00:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(true);
  });

  it('allows contiguous non-overlapping slot before base (touching at 10:00)', () => {
    const aStart = new Date('2026-10-30T09:00:00Z');
    const aEnd = new Date('2026-10-30T10:00:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(false);
  });

  it('allows contiguous non-overlapping slot after base (touching at 11:00)', () => {
    const aStart = new Date('2026-10-30T11:00:00Z');
    const aEnd = new Date('2026-10-30T12:00:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(false);
  });

  it('allows completely disjoint interval', () => {
    const aStart = new Date('2026-10-30T14:00:00Z');
    const aEnd = new Date('2026-10-30T15:00:00Z');
    expect(intervalsOverlap(baseStart, baseEnd, aStart, aEnd)).toBe(false);
  });
});
