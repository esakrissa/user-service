// ============================================================================
// Base Error Class
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse(): {
    statusCode: number;
    body: string;
  } {
    const responseBody: Record<string, unknown> = {
      statusCode: this.statusCode,
      error: this.code,
      message: this.message,
    };

    if (this.details) {
      responseBody.details = this.details;
    }

    return {
      statusCode: this.statusCode,
      body: JSON.stringify(responseBody),
    };
  }
}

// ============================================================================
// HTTP Errors
// ============================================================================

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'Bad Request', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'Unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'Forbidden');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'Not Found');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'Conflict');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string, retryAfter?: number) {
    super(message, 429, 'Too Many Requests', retryAfter ? { retryAfter } : undefined);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'Internal Server Error');
  }
}

// ============================================================================
// Domain Errors
// ============================================================================

export class UserNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
  }
}

export class EmailNotFoundError extends NotFoundError {
  constructor(emailId: string) {
    super(`Email not found: ${emailId}`);
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  constructor() {
    super('Email address is not available');
  }
}

export class VersionConflictError extends ConflictError {
  constructor() {
    super('Resource was modified. Please refresh and try again.');
  }
}

export class CannotDeletePrimaryEmailError extends BadRequestError {
  constructor() {
    super('Cannot delete primary email. Set another email as primary first.');
  }
}

export class CannotDeleteLastEmailError extends BadRequestError {
  constructor() {
    super('Cannot delete last email. Account must have at least one email.');
  }
}

export class EmailNotVerifiedError extends BadRequestError {
  constructor() {
    super('Email must be verified before setting as primary');
  }
}

export class AccountNotActiveError extends ForbiddenError {
  constructor() {
    super('Account is not active');
  }
}

// ============================================================================
// Error Type Guard
// ============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// ============================================================================
// Error Handler Helper
// ============================================================================

export function handleError(error: unknown): { statusCode: number; body: string } {
  if (isAppError(error)) {
    return error.toResponse();
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  return new InternalError().toResponse();
}
