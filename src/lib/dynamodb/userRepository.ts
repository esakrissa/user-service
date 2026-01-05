import {
  GetCommand,
  UpdateCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { dynamodb, TABLE_NAME, GSI1_INDEX } from './client';
import {
  User,
  UserProfileItem,
  EmailItem,
  Keys,
  toUser,
  UpdateUserInput,
  UserStatus,
} from '../types';
import {
  UserNotFoundError,
  EmailAlreadyExistsError,
  VersionConflictError,
} from '../../utils/errors';
import { logger } from '../../utils/logger';

// ============================================================================
// User Operations
// ============================================================================

/**
 * Get user by userId
 */
export async function getUser(userId: string): Promise<User | null> {
  const keys = Keys.user(userId);

  const result = await dynamodb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: keys,
    })
  );

  if (!result.Item) {
    return null;
  }

  return toUser(result.Item as UserProfileItem);
}

/**
 * Get user or throw NotFoundError
 */
export async function getUserOrThrow(userId: string): Promise<User> {
  const user = await getUser(userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }
  return user;
}

/**
 * Create user with primary email (used by Cognito post-confirmation trigger)
 */
export async function createUser(
  userId: string,
  email: string,
  emailId: string
): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();

  // Check if email already exists
  const existingEmail = await checkEmailExists(normalizedEmail);
  if (existingEmail) {
    throw new EmailAlreadyExistsError();
  }

  const userItem: UserProfileItem = {
    ...Keys.user(userId),
    userId,
    email: normalizedEmail,
    status: UserStatus.ACTIVE,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const emailItem: EmailItem = {
    ...Keys.email(userId, emailId),
    ...Keys.emailGSI(normalizedEmail, userId),
    emailId,
    userId,
    email: normalizedEmail,
    isPrimary: true,
    isVerified: true, // Cognito verified it
    verifiedAt: now,
    createdAt: now,
  };

  try {
    await dynamodb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: userItem,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: emailItem,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
        ],
      })
    );

    logger.info('User created', { userId, email: normalizedEmail });
    return toUser(userItem);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new EmailAlreadyExistsError();
    }
    throw error;
  }
}

/**
 * Update user profile with optimistic locking
 */
export async function updateUser(
  userId: string,
  updates: UpdateUserInput,
  expectedVersion: number
): Promise<User> {
  const now = new Date().toISOString();
  const keys = Keys.user(userId);

  // Build update expression dynamically
  const updateParts: string[] = ['#version = #version + :inc', '#updatedAt = :now'];
  const expressionNames: Record<string, string> = {
    '#version': 'version',
    '#updatedAt': 'updatedAt',
  };
  const expressionValues: Record<string, unknown> = {
    ':inc': 1,
    ':now': now,
    ':expectedVersion': expectedVersion,
  };

  if (updates.firstName !== undefined) {
    updateParts.push('#firstName = :firstName');
    expressionNames['#firstName'] = 'firstName';
    expressionValues[':firstName'] = updates.firstName;
  }

  if (updates.lastName !== undefined) {
    updateParts.push('#lastName = :lastName');
    expressionNames['#lastName'] = 'lastName';
    expressionValues[':lastName'] = updates.lastName;
  }

  if (updates.phone !== undefined) {
    if (updates.phone === null) {
      updateParts.push('REMOVE #phone');
      expressionNames['#phone'] = 'phone';
    } else {
      updateParts.push('#phone = :phone');
      expressionNames['#phone'] = 'phone';
      expressionValues[':phone'] = updates.phone;
    }
  }

  // Separate SET and REMOVE parts
  const setParts = updateParts.filter(p => !p.startsWith('REMOVE'));
  const removeParts = updateParts.filter(p => p.startsWith('REMOVE')).map(p => p.replace('REMOVE ', ''));

  let updateExpression = `SET ${setParts.join(', ')}`;
  if (removeParts.length > 0) {
    updateExpression += ` REMOVE ${removeParts.join(', ')}`;
  }

  try {
    const result = await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys,
        UpdateExpression: updateExpression,
        ConditionExpression: '#version = :expectedVersion',
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    logger.info('User updated', { userId, changedFields: Object.keys(updates) });
    return toUser(result.Attributes as UserProfileItem);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new VersionConflictError();
    }
    throw error;
  }
}

/**
 * Soft delete user (set status to deleted)
 */
export async function softDeleteUser(userId: string, expectedVersion: number): Promise<User> {
  const now = new Date().toISOString();
  const keys = Keys.user(userId);

  try {
    const result = await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys,
        UpdateExpression: 'SET #status = :status, #version = #version + :inc, #updatedAt = :now',
        ConditionExpression: '#version = :expectedVersion AND #status <> :deleted',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#version': 'version',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': UserStatus.DELETED,
          ':inc': 1,
          ':now': now,
          ':expectedVersion': expectedVersion,
          ':deleted': UserStatus.DELETED,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    logger.info('User soft deleted', { userId });
    return toUser(result.Attributes as UserProfileItem);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new VersionConflictError();
    }
    throw error;
  }
}

// ============================================================================
// Email Operations
// ============================================================================

/**
 * Check if email already exists in the system
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const lookup = Keys.emailLookup(normalizedEmail);

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_INDEX,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': lookup.GSI1PK,
      },
      Limit: 1,
    })
  );

  return (result.Items?.length ?? 0) > 0;
}

/**
 * Get all emails for a user
 */
export async function getUserEmails(userId: string): Promise<EmailItem[]> {
  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'EMAIL#',
      },
    })
  );

  return (result.Items ?? []) as EmailItem[];
}

/**
 * Get user by email address (via GSI1)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const lookup = Keys.emailLookup(normalizedEmail);

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_INDEX,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': lookup.GSI1PK,
      },
      Limit: 1,
    })
  );

  if (!result.Items?.[0]) {
    return null;
  }

  const emailItem = result.Items[0] as EmailItem;
  return getUser(emailItem.userId);
}
