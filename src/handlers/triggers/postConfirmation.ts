import type { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';
import { createUser } from '../../lib/dynamodb';
import { publishUserCreated } from '../../lib/events';
import { EmailAlreadyExistsError, logger } from '../../utils';
import { randomUUID } from 'crypto';

// ============================================================================
// Helper: Sleep for exponential backoff
// ============================================================================

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Post-Confirmation Trigger
// ============================================================================

/**
 * Cognito Post-Confirmation Trigger
 * Creates the user record in DynamoDB after email verification
 */
export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  const { sub: userId, email } = event.request.userAttributes;

  if (!userId || !email) {
    logger.error('Missing required user attributes', undefined, {
      hasUserId: !!userId,
      hasEmail: !!email,
    });
    return event;
  }

  // Generate a correlation ID for tracing
  const correlationId = `cognito-${event.triggerSource}-${userId}-${Date.now()}`;
  logger.setContext({ correlationId, userId });

  logger.info('Post-confirmation trigger invoked', {
    triggerSource: event.triggerSource,
    userPoolId: event.userPoolId,
    email,
  });

  // Only process post-confirmation (not post-confirmation-resend)
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    logger.info('Skipping non-signup confirmation', { triggerSource: event.triggerSource });
    return event;
  }

  const maxRetries = 3;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const emailId = randomUUID();

      // Create user record in DynamoDB
      await createUser(userId, email, emailId);

      logger.info('User record created', { userId, email, attempt });

      // Publish user.created event
      await publishUserCreated(userId, email, correlationId);

      logger.info('User creation completed successfully', { userId });
      return event;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if email already exists
      if (error instanceof EmailAlreadyExistsError) {
        logger.warn('Email already exists, user may already be created', { userId, email });
        return event;
      }

      logger.warn('User creation failed', {
        userId,
        attempt,
        error: lastError.message,
      });

      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const backoffMs = 100 * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
      }
    }
  }

  // All retries failed
  logger.error('User creation failed after all retries', lastError, {
    userId,
    email,
    maxRetries,
  });

  // IMPORTANT: We must return the event even on failure
  // The user is already confirmed in Cognito, failing here would leave them
  // in an inconsistent state. We log the error for manual intervention.
  // In production, you'd queue this to a DLQ for async retry.
  return event;
};
