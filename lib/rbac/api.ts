import "server-only";

import { NextResponse } from "next/server";
import type { ApiErrorCode, AuthContext } from "./types";
import { API_ERROR_STATUS } from "./types";
import { isAuthError, getErrorStatus, requireAuth } from "./authz";

// ─────────────────────────────────────────────────────────────────────────────
// API Response Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  const status = API_ERROR_STATUS[code];
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details },
    },
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (isAuthError(error)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: getErrorStatus(error) }
    );
  }

  if (error instanceof Error) {
    return errorResponse("INTERNAL_ERROR", error.message);
  }

  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred");
}

// ─────────────────────────────────────────────────────────────────────────────
// API Handler Wrapper
// ─────────────────────────────────────────────────────────────────────────────

type ApiHandler<T = unknown> = (ctx: AuthContext) => Promise<NextResponse<T>>;
type PublicApiHandler<T = unknown> = () => Promise<NextResponse<T>>;

export function withAuth<T = unknown>(handler: ApiHandler<T>) {
  return async (): Promise<NextResponse> => {
    try {
      const ctx = await requireAuth();
      return await handler(ctx);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function withPublic<T = unknown>(handler: PublicApiHandler<T>) {
  return async (): Promise<NextResponse> => {
    try {
      return await handler();
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Validation Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "array" | "object";
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
  message?: string;
}

export function validateRequest<T extends Record<string, unknown>>(
  data: unknown,
  rules: ValidationRule<T>[]
): { valid: true; data: T } | { valid: false; errors: Record<string, string> } {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: { _root: "Request body must be an object" } };
  }

  const errors: Record<string, string> = {};
  const obj = data as Record<string, unknown>;

  for (const rule of rules) {
    const fieldName = String(rule.field);
    const value = obj[fieldName];

    if (rule.required && (value === undefined || value === null || value === "")) {
      errors[fieldName] = rule.message || `${fieldName} is required`;
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    if (rule.type) {
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (actualType !== rule.type) {
        errors[fieldName] = rule.message || `${fieldName} must be of type ${rule.type}`;
        continue;
      }
    }

    if (rule.type === "string" && typeof value === "string") {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors[fieldName] = rule.message || `${fieldName} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors[fieldName] = rule.message || `${fieldName} must be at most ${rule.maxLength} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[fieldName] = rule.message || `${fieldName} has invalid format`;
      }
    }

    if (rule.type === "number" && typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        errors[fieldName] = rule.message || `${fieldName} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        errors[fieldName] = rule.message || `${fieldName} must be at most ${rule.max}`;
      }
    }

    if (rule.custom && !rule.custom(value)) {
      errors[fieldName] = rule.message || `${fieldName} is invalid`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: obj as T };
}

export function validationError(errors: Record<string, string>): NextResponse {
  return errorResponse("VALIDATION_ERROR", "Validation failed", { errors });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || String(defaults.page || 1)));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(defaults.limit || 20))));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
