import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Base Authorization Error
// ─────────────────────────────────────────────────────────────────────────────

export abstract class AuthzError extends Error {
  abstract readonly status: number;
  readonly safeMessage: string;

  constructor(message: string, safeMessage?: string) {
    super(message);
    this.name = this.constructor.name;
    this.safeMessage = safeMessage ?? message;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: this.safeMessage,
      status: this.status,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 401 Authentication Required
// ─────────────────────────────────────────────────────────────────────────────

export class AuthRequiredError extends AuthzError {
  readonly status = 401;

  constructor(message: string = "Authentication required") {
    super(message, "Authentication required");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 403 Forbidden
// ─────────────────────────────────────────────────────────────────────────────

export class ForbiddenError extends AuthzError {
  readonly status = 403;

  constructor(message: string = "Access denied", safeMessage?: string) {
    super(message, safeMessage ?? "Access denied");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guard
// ─────────────────────────────────────────────────────────────────────────────

export function isAuthzError(error: unknown): error is AuthzError {
  return error instanceof AuthzError;
}
