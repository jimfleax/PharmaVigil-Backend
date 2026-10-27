import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppVariables, ErrorDetail, ErrorEnvelope } from '../types/index.js';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: ErrorDetail[] = []) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHENTICATED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden for current role or tenant') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'This record changed. Reload and review the latest version.') {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(429, 'RATE_LIMITED', message);
  }
}

export const errorHandler: ErrorHandler<{ Variables: AppVariables }> = (err, c) => {
  const requestId = c.get('requestId') || 'unknown';

  if (err instanceof AppError) {
    const response: ErrorEnvelope = {
      error: {
        code: err.code,
        message: err.message,
        requestId,
        details: err.details,
      },
    };
    return c.json(response, err.statusCode as ContentfulStatusCode);
  }

  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.errors.map((e) => ({
      field: e.path.join('.'),
      code: e.code,
      message: e.message,
    }));

    const response: ErrorEnvelope = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The submitted request payload failed schema validation.',
        requestId,
        details,
      },
    };
    return c.json(response, 422);
  }

  // Fallback for unhandled unexpected internal errors
  // Safe message: never leak database credentials or internal stack traces
  console.error(`[UnhandledError] requestId=${requestId}:`, err);

  const response: ErrorEnvelope = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred. Please retry.',
      requestId,
      details: [],
    },
  };
  return c.json(response, 500);
};
