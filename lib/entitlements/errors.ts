import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Entitlement Error (409 Conflict)
// ─────────────────────────────────────────────────────────────────────────────

export class EntitlementError extends Error {
  readonly status = 409;
  readonly safeMessage: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, safeMessage?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "EntitlementError";
    this.safeMessage = safeMessage ?? "Entitlement limit reached";
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: this.safeMessage,
      status: this.status,
      details: this.details,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guard
// ─────────────────────────────────────────────────────────────────────────────

export function isEntitlementError(error: unknown): error is EntitlementError {
  return error instanceof EntitlementError;
}
