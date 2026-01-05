import type { APIGatewayProxyResult } from 'aws-lambda';
import {
  createHandler,
  AuthorizedEvent,
  successResponse,
  getUserIdFromEvent,
  getRequestId,
} from '../../lib/middleware';
import { getUserOrThrow, updateUser } from '../../lib/dynamodb';
import { publishUserUpdated } from '../../lib/events';
import { updateUserSchema, UpdateUserInput } from '../../lib/types';
import { BadRequestError, logger } from '../../utils';

/**
 * PUT /users/me
 * Update the current authenticated user's profile
 */
const updateMeHandler = async (event: AuthorizedEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserIdFromEvent(event);
  const requestId = getRequestId(event);

  // Validate request body
  const parseResult = updateUserSchema.safeParse(event.body);
  if (!parseResult.success) {
    throw new BadRequestError('Invalid request body', parseResult.error.flatten().fieldErrors);
  }

  const updates: UpdateUserInput = parseResult.data;

  // Check if there are any updates to make
  if (Object.keys(updates).length === 0) {
    throw new BadRequestError('No fields to update');
  }

  logger.info('Updating user profile', { userId, fields: Object.keys(updates) });

  // Get current user to get version for optimistic locking
  const currentUser = await getUserOrThrow(userId);

  // Update user
  const updatedUser = await updateUser(userId, updates, currentUser.version);

  // Publish event (best effort - failures don't break the operation)
  await publishUserUpdated(userId, Object.keys(updates), requestId);

  return successResponse(updatedUser);
};

export const handler = createHandler(updateMeHandler);
