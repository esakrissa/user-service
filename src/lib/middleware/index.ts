import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { logger, AppError, handleError } from '../../utils';

// ============================================================================
// Types
// ============================================================================

export interface AuthorizedEvent extends APIGatewayProxyEvent {
  requestContext: APIGatewayProxyEvent['requestContext'] & {
    authorizer: {
      claims: {
        sub: string;
        email: string;
        email_verified: string;
        'cognito:username': string;
      };
    };
  };
}

export type AuthorizedHandler = Handler<AuthorizedEvent, APIGatewayProxyResult>;

// ============================================================================
// Custom Middleware: Logging
// ============================================================================

const loggingMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  return {
    before: (request): void => {
      const { event } = request;
      const requestId = event.requestContext.requestId;
      const userId = (event as AuthorizedEvent).requestContext?.authorizer?.claims?.sub;

      logger.setContext({ requestId, userId });
      logger.info('Request started', {
        method: event.httpMethod,
        path: event.path,
      });
    },
    after: (request): void => {
      logger.info('Request completed', {
        statusCode: request.response?.statusCode,
      });
      logger.clearContext();
    },
    onError: (request): void => {
      logger.error('Request failed', request.error);
      logger.clearContext();
    },
  };
};

// ============================================================================
// Custom Middleware: Error Handling
// ============================================================================

const appErrorHandler = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  return {
    onError: (request): void => {
      const { error } = request;

      if (error instanceof AppError) {
        request.response = error.toResponse();
        return;
      }

      // Let default error handler deal with other errors
      request.response = handleError(error);
    },
  };
};

// ============================================================================
// Custom Middleware: CORS
// ============================================================================

const corsMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  return {
    after: (request): void => {
      if (request.response) {
        request.response.headers = {
          ...request.response.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
        };
      }
    },
    onError: (request): void => {
      if (request.response) {
        request.response.headers = {
          ...request.response.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
        };
      }
    },
  };
};

// ============================================================================
// Middleware Factory
// ============================================================================

export function createHandler(handler: AuthorizedHandler): middy.MiddyfiedHandler {
  return middy(handler)
    .use(loggingMiddleware())
    .use(httpJsonBodyParser())
    .use(appErrorHandler())
    .use(corsMiddleware())
    .use(httpErrorHandler());
}

// ============================================================================
// Response Helpers
// ============================================================================

export function jsonResponse<T>(statusCode: number, body: T): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export function successResponse<T>(body: T): APIGatewayProxyResult {
  return jsonResponse(200, body);
}

export function createdResponse<T>(body: T): APIGatewayProxyResult {
  return jsonResponse(201, body);
}

export function noContentResponse(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    body: '',
  };
}

// ============================================================================
// Request Helpers
// ============================================================================

export function getUserIdFromEvent(event: AuthorizedEvent): string {
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    throw new Error('User ID not found in token claims');
  }
  return userId;
}

export function getRequestId(event: APIGatewayProxyEvent): string {
  return event.requestContext.requestId;
}
