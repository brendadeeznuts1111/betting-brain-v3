/**
 * Centralized Error Handling
 * Provides consistent error responses across all endpoints
 * See .cursor/rules/api-patterns.mdc for error handling patterns
 */

export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
}

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  message: string;
  details?: any;
  requestId?: string;
  timestamp: string;
  path?: string;
}

export class APIError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | APIError | unknown,
  requestId?: string,
  path?: string
): Response {
  let statusCode = 500;
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let message = 'An internal error occurred';
  let details: any = undefined;

  // Handle APIError
  if (error instanceof APIError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  }
  // Handle standard Error
  else if (error instanceof Error) {
    message = error.message;
    
    // Map common errors to status codes
    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = ErrorCode.NOT_FOUND;
    } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      statusCode = 401;
      errorCode = ErrorCode.UNAUTHORIZED;
    } else if (error.message.includes('forbidden')) {
      statusCode = 403;
      errorCode = ErrorCode.FORBIDDEN;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorCode = ErrorCode.TIMEOUT;
    } else if (error.message.includes('database') || error.message.includes('query')) {
      statusCode = 500;
      errorCode = ErrorCode.DATABASE_ERROR;
    }
  }

  const errorResponse: ErrorResponse = {
    error: errorCode,
    code: errorCode,
    message,
    details,
    requestId,
    timestamp: new Date().toISOString(),
    path
  };

  // Log error for debugging
  console.error(`[${requestId}] ❌ Error:`, {
    code: errorCode,
    message,
    statusCode,
    path,
    details: details || (error instanceof Error ? error.stack : undefined)
  });

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * Common error creators
 */
export const Errors = {
  badRequest: (message: string, details?: any) =>
    new APIError(ErrorCode.BAD_REQUEST, message, 400, details),
  
  unauthorized: (message: string = 'Unauthorized') =>
    new APIError(ErrorCode.UNAUTHORIZED, message, 401),
  
  forbidden: (message: string = 'Forbidden') =>
    new APIError(ErrorCode.FORBIDDEN, message, 403),
  
  notFound: (resource: string = 'Resource') =>
    new APIError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),
  
  validationError: (errors: string[]) =>
    new APIError(ErrorCode.VALIDATION_ERROR, 'Validation failed', 400, { errors }),
  
  rateLimit: (message: string = 'Rate limit exceeded') =>
    new APIError(ErrorCode.RATE_LIMIT, message, 429),
  
  databaseError: (message: string) =>
    new APIError(ErrorCode.DATABASE_ERROR, `Database error: ${message}`, 500),
  
  serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
    new APIError(ErrorCode.SERVICE_UNAVAILABLE, message, 503),
  
  timeout: (message: string = 'Request timeout') =>
    new APIError(ErrorCode.TIMEOUT, message, 504),
};

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  handler: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>
) {
  return async (request: Request, env: any, ctx: ExecutionContext): Promise<Response> => {
    const requestId = Date.now().toString(36);
    const url = new URL(request.url);
    
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      return createErrorResponse(error, requestId, url.pathname);
    }
  };
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any, schema?: any): Response {
  // Validate data against schema if provided
  if (schema) {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(`Invalid response data: ${result.error.errors.map(e => e.message).join(', ')}`);
    }
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Validate environment bindings
 */
export function validateEnv(env: any, required: string[]): void {
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new APIError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Required services not configured',
      503,
      { missing }
    );
  }
}

