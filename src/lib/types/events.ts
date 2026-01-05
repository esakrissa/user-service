// ============================================================================
// Event Types
// ============================================================================

export const EventType = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_SUSPENDED: 'user.suspended',
  USER_REACTIVATED: 'user.reactivated',
  EMAIL_ADDED: 'email.added',
  EMAIL_VERIFIED: 'email.verified',
  EMAIL_REMOVED: 'email.removed',
  EMAIL_PRIMARY_CHANGED: 'email.primary.changed',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

// ============================================================================
// Event Metadata
// ============================================================================

export interface EventMetadata {
  correlationId: string;
  environment: string;
  timestamp: string;
}

// ============================================================================
// Base Event Structure
// ============================================================================

export interface BaseEvent<T extends EventType, D> {
  version: '1.0';
  source: 'user-service';
  detailType: T;
  detail: D & {
    metadata: EventMetadata;
  };
}

// ============================================================================
// User Event Details
// ============================================================================

export interface UserCreatedDetail {
  userId: string;
  email: string;
}

export interface UserUpdatedDetail {
  userId: string;
  changedFields: string[];
}

export interface UserDeletedDetail {
  userId: string;
}

export interface UserSuspendedDetail {
  userId: string;
  reason?: string;
}

export interface UserReactivatedDetail {
  userId: string;
}

// ============================================================================
// Email Event Details
// ============================================================================

export interface EmailAddedDetail {
  userId: string;
  emailId: string;
  email: string;
}

export interface EmailVerifiedDetail {
  userId: string;
  emailId: string;
  email: string;
}

export interface EmailRemovedDetail {
  userId: string;
  emailId: string;
  email: string;
}

export interface EmailPrimaryChangedDetail {
  userId: string;
  oldEmail: string;
  newEmail: string;
}

// ============================================================================
// Event Type Mappings
// ============================================================================

export type UserCreatedEvent = BaseEvent<'user.created', UserCreatedDetail>;
export type UserUpdatedEvent = BaseEvent<'user.updated', UserUpdatedDetail>;
export type UserDeletedEvent = BaseEvent<'user.deleted', UserDeletedDetail>;
export type UserSuspendedEvent = BaseEvent<'user.suspended', UserSuspendedDetail>;
export type UserReactivatedEvent = BaseEvent<'user.reactivated', UserReactivatedDetail>;
export type EmailAddedEvent = BaseEvent<'email.added', EmailAddedDetail>;
export type EmailVerifiedEvent = BaseEvent<'email.verified', EmailVerifiedDetail>;
export type EmailRemovedEvent = BaseEvent<'email.removed', EmailRemovedDetail>;
export type EmailPrimaryChangedEvent = BaseEvent<'email.primary.changed', EmailPrimaryChangedDetail>;

export type UserServiceEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserSuspendedEvent
  | UserReactivatedEvent
  | EmailAddedEvent
  | EmailVerifiedEvent
  | EmailRemovedEvent
  | EmailPrimaryChangedEvent;

// ============================================================================
// Event Builder Types
// ============================================================================

export type EventDetailMap = {
  'user.created': UserCreatedDetail;
  'user.updated': UserUpdatedDetail;
  'user.deleted': UserDeletedDetail;
  'user.suspended': UserSuspendedDetail;
  'user.reactivated': UserReactivatedDetail;
  'email.added': EmailAddedDetail;
  'email.verified': EmailVerifiedDetail;
  'email.removed': EmailRemovedDetail;
  'email.primary.changed': EmailPrimaryChangedDetail;
};
