export class ApplicationError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Unauthenticated') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Not authorized') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Normalizes an unknown error into a safe client-facing structure.
 * Prevents database or system internals from leaking to the frontend.
 */
export function handleError(error: unknown) {
  if (error instanceof ApplicationError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  // TODO: Send to external logger (e.g., Sentry, Datadog)
  console.error('[Unhandled System Error]:', error);

  return {
    error: 'An unexpected internal error occurred.',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}
