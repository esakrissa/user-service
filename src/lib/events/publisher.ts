import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { EventType, EventDetailMap, EventMetadata } from '../types';
import { logger } from '../../utils/logger';

// ============================================================================
// EventBridge Client
// ============================================================================

const eventBridge = new EventBridgeClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME ?? 'dev-user-service';
const SOURCE = 'user-service';
const EVENT_VERSION = '1.0';

// ============================================================================
// Event Publisher
// ============================================================================

export interface PublishEventOptions {
  correlationId: string;
}

/**
 * Publish an event to EventBridge
 */
export async function publishEvent<T extends EventType>(
  detailType: T,
  detail: EventDetailMap[T],
  options: PublishEventOptions
): Promise<void> {
  const metadata: EventMetadata = {
    correlationId: options.correlationId,
    environment: process.env.STAGE ?? 'unknown',
    timestamp: new Date().toISOString(),
  };

  const eventDetail = {
    version: EVENT_VERSION,
    ...detail,
    metadata,
  };

  try {
    const result = await eventBridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: SOURCE,
            DetailType: detailType,
            Detail: JSON.stringify(eventDetail),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );

    if (result.FailedEntryCount && result.FailedEntryCount > 0) {
      const failedEntry = result.Entries?.find(e => e.ErrorCode);
      logger.error('Failed to publish event', undefined, {
        detailType,
        errorCode: failedEntry?.ErrorCode,
        errorMessage: failedEntry?.ErrorMessage,
      });
      throw new Error(`Failed to publish event: ${failedEntry?.ErrorMessage}`);
    }

    logger.info('Event published', {
      detailType,
      eventId: result.Entries?.[0]?.EventId,
      correlationId: options.correlationId,
    });
  } catch (error) {
    logger.error('Error publishing event', error, { detailType });
    // Don't throw - event publishing failures shouldn't break the main operation
    // In production, you'd want to implement the outbox pattern here
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export async function publishUserCreated(
  userId: string,
  email: string,
  correlationId: string
): Promise<void> {
  await publishEvent(
    EventType.USER_CREATED,
    { userId, email },
    { correlationId }
  );
}

export async function publishUserUpdated(
  userId: string,
  changedFields: string[],
  correlationId: string
): Promise<void> {
  await publishEvent(
    EventType.USER_UPDATED,
    { userId, changedFields },
    { correlationId }
  );
}

export async function publishUserDeleted(
  userId: string,
  correlationId: string
): Promise<void> {
  await publishEvent(
    EventType.USER_DELETED,
    { userId },
    { correlationId }
  );
}
