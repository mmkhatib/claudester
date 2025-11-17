"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.HttpStatus = void 0;
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.validationError = validationError;
exports.authenticationError = authenticationError;
exports.authorizationError = authorizationError;
exports.notFoundError = notFoundError;
exports.conflictError = conflictError;
exports.databaseError = databaseError;
exports.handleApiError = handleApiError;
exports.withErrorHandling = withErrorHandling;
exports.parseBody = parseBody;
exports.parseSearchParams = parseSearchParams;
const server_1 = require("next/server");
// HTTP status codes
exports.HttpStatus = {
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
};
// Error codes
exports.ErrorCode = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
};
/**
 * Create a success response
 */
function successResponse(data, message, status = exports.HttpStatus.OK) {
    return server_1.NextResponse.json({
        success: true,
        data,
        message,
    }, { status });
}
/**
 * Create an error response
 */
function errorResponse(message, code, status = exports.HttpStatus.INTERNAL_SERVER_ERROR, details) {
    return server_1.NextResponse.json({
        success: false,
        error: {
            message,
            code,
            details,
        },
    }, { status });
}
/**
 * Handle validation errors (Zod)
 */
function validationError(error) {
    return errorResponse('Validation failed', exports.ErrorCode.VALIDATION_ERROR, exports.HttpStatus.UNPROCESSABLE_ENTITY, error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
    })));
}
/**
 * Handle authentication errors
 */
function authenticationError(message = 'Authentication required') {
    return errorResponse(message, exports.ErrorCode.AUTHENTICATION_ERROR, exports.HttpStatus.UNAUTHORIZED);
}
/**
 * Handle authorization errors
 */
function authorizationError(message = 'Insufficient permissions') {
    return errorResponse(message, exports.ErrorCode.AUTHORIZATION_ERROR, exports.HttpStatus.FORBIDDEN);
}
/**
 * Handle not found errors
 */
function notFoundError(resource = 'Resource') {
    return errorResponse(`${resource} not found`, exports.ErrorCode.NOT_FOUND, exports.HttpStatus.NOT_FOUND);
}
/**
 * Handle conflict errors
 */
function conflictError(message = 'Resource already exists') {
    return errorResponse(message, exports.ErrorCode.CONFLICT, exports.HttpStatus.CONFLICT);
}
/**
 * Handle database errors
 */
function databaseError(error) {
    console.error('Database error:', error);
    return errorResponse('Database operation failed', exports.ErrorCode.DATABASE_ERROR, exports.HttpStatus.INTERNAL_SERVER_ERROR, process.env.NODE_ENV === 'development' ? error?.message : undefined);
}
/**
 * Generic error handler for API routes
 */
function handleApiError(error) {
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
    return errorResponse(process.env.NODE_ENV === 'development'
        ? error.message || 'Internal server error'
        : 'An unexpected error occurred', exports.ErrorCode.INTERNAL_ERROR, exports.HttpStatus.INTERNAL_SERVER_ERROR);
}
/**
 * Wrap an async API handler with error handling
 */
function withErrorHandling(handler) {
    return (async (...args) => {
        try {
            return await handler(...args);
        }
        catch (error) {
            return handleApiError(error);
        }
    });
}
/**
 * Parse and validate request body
 */
async function parseBody(request, schema) {
    const body = await request.json();
    if (schema) {
        return schema.parse(body);
    }
    return body;
}
/**
 * Parse and validate URL search params
 */
function parseSearchParams(request, schema) {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    if (schema) {
        return schema.parse(params);
    }
    return params;
}
