import type { APIGatewayProxyResult } from 'aws-lambda';
import {
  createHandler,
  AuthorizedEvent,
  jsonResponse,
  getUserIdFromEvent,
  getRequestId,
} from '../../lib/middleware';
import { getUserOrThrow, softDeleteUser } from '../../lib/dynamodb';
import { publishUserDeleted } from '../../lib/events';
import { logger } from '../../utils';

/**
 * DELETE /users/me
 * Soft delete the current authenticated user's account
 */
const deleteMeHandler = async (event: AuthorizedEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserIdFromEvent(event);
  const requestId = getRequestId(event);

  logger.info('Soft deleting user', { userId });

  // Get current user to get version for optimistic locking
  const currentUser = await getUserOrThrow(userId);

  // Soft delete user (set status to 'deleted')
  await softDeleteUser(userId, currentUser.version);

  // Publish event (best effort - failures don't break the operation)
  await publishUserDeleted(userId, requestId);

  return jsonResponse(200, {
    message: 'Account scheduled for deletion',
    deletedAt: new Date().toISOString(),
  });
};

export const handler = createHandler(deleteMeHandler);
