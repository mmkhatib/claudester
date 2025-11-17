import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

// Standard API response types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// HTTP status codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error codes
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
} as const;

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = HttpStatus.OK
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  code?: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
    },
    { status }
  );
}

/**
 * Handle validation errors (Zod)
 */
export function validationError(
  error: ZodError
): NextResponse<ApiErrorResponse> {
  return errorResponse(
    'Validation failed',
    ErrorCode.VALIDATION_ERROR,
    HttpStatus.UNPROCESSABLE_ENTITY,
    error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
  );
}

/**
 * Handle authentication errors
 */
export function authenticationError(
  message: string = 'Authentication required'
): NextResponse<ApiErrorResponse> {
  return errorResponse(
    message,
    ErrorCode.AUTHENTICATION_ERROR,
    HttpStatus.UNAUTHORIZED
  );
}

/**
 * Handle authorization errors
 */
export function authorizationError(
  message: string = 'Insufficient permissions'
): NextResponse<ApiErrorResponse> {
  return errorResponse(
    message,
    ErrorCode.AUTHORIZATION_ERROR,
    HttpStatus.FORBIDDEN
  );
}

/**
 * Handle not found errors
 */
export function notFoundError(
  resource: string = 'Resource'
): NextResponse<ApiErrorResponse> {
  return errorResponse(
    `${resource} not found`,
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND
  );
}

/**
 * Handle conflict errors
 */
export function conflictError(
  message: string = 'Resource already exists'
): NextResponse<ApiErrorResponse> {
  return errorResponse(
    message,
    ErrorCode.CONFLICT,
    HttpStatus.CONFLICT
  );
}

/**
 * Handle database errors
 */
export function databaseError(
  error?: any
): NextResponse<ApiErrorResponse> {
  console.error('Database error:', error);

  return errorResponse(
    'Database operation failed',
    ErrorCode.DATABASE_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR,
    process.env.NODE_ENV === 'development' ? error?.message : undefined
  );
}

/**
 * Generic error handler for API routes
 */
export function handleApiError(error: any): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  // Handle known error types
  if (error.name === 'ZodError') {
    return validationError(error);
  }

  if (error.message?.includes('Unauthorized')) {
    return authenticationError(error.message);
  }

  if (error.message?.includes('Forbidden')) {
    return authorizationError(error.message);
  }

  if (error.message?.includes('not found')) {
    return notFoundError();
  }

  if (error.code === 11000) {
    // MongoDB duplicate key error
    return conflictError('Resource with this identifier already exists');
  }

  // Default to internal server error
  return errorResponse(
    process.env.NODE_ENV === 'development'
      ? error.message || 'Internal server error'
      : 'An unexpected error occurred',
    ErrorCode.INTERNAL_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}

/**
 * Wrap an async API handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

/**
 * Parse and validate request body
 */
export async function parseBody<T>(
  request: Request,
  schema?: any
): Promise<T> {
  const body = await request.json();

  if (schema) {
    return schema.parse(body);
  }

  return body;
}

/**
 * Parse and validate URL search params
 */
export function parseSearchParams(
  request: Request,
  schema?: any
): any {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams);

  if (schema) {
    return schema.parse(params);
  }

  return params;
}
