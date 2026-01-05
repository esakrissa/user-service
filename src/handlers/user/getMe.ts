import type { APIGatewayProxyResult } from 'aws-lambda';
import {
  createHandler,
  AuthorizedEvent,
  successResponse,
  getUserIdFromEvent,
} from '../../lib/middleware';
import { getUserOrThrow } from '../../lib/dynamodb';
import { logger } from '../../utils/logger';

/**
 * GET /users/me
 * Get the current authenticated user's profile
 */
const getMeHandler = async (event: AuthorizedEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserIdFromEvent(event);

  logger.info('Getting user profile', { userId });

  const user = await getUserOrThrow(userId);

  return successResponse(user);
};

export const handler = createHandler(getMeHandler);
