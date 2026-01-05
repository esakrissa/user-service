import { z } from 'zod';

// ============================================================================
// User Status
// ============================================================================

export const UserStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// ============================================================================
// User Entity (Application Layer)
// ============================================================================

export interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: UserStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Email Entity (Application Layer)
// ============================================================================

export interface Email {
  emailId: string;
  userId: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

// ============================================================================
// DynamoDB Item Types (Data Layer)
// ============================================================================

export interface UserProfileItem {
  PK: string; // USER#{userId}
  SK: 'PROFILE';
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: UserStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailItem {
  PK: string; // USER#{userId}
  SK: string; // EMAIL#{emailId}
  GSI1PK: string; // EMAIL#{normalizedEmail}
  GSI1SK: string; // USER#{userId}
  emailId: string;
  userId: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export type UserServiceItem = UserProfileItem | EmailItem;

// ============================================================================
// Key Builders
// ============================================================================

export const Keys = {
  user: (userId: string) => ({
    PK: `USER#${userId}`,
    SK: 'PROFILE' as const,
  }),

  email: (userId: string, emailId: string) => ({
    PK: `USER#${userId}`,
    SK: `EMAIL#${emailId}`,
  }),

  emailGSI: (email: string, userId: string) => ({
    GSI1PK: `EMAIL#${email.toLowerCase().trim()}`,
    GSI1SK: `USER#${userId}`,
  }),

  emailLookup: (email: string) => ({
    GSI1PK: `EMAIL#${email.toLowerCase().trim()}`,
  }),
} as const;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const updateUserSchema = z
  .object({
    firstName: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[\p{L}\p{M}\s'-]+$/u, 'Invalid characters in name')
      .optional(),
    lastName: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[\p{L}\p{M}\s'-]+$/u, 'Invalid characters in name')
      .optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format')
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .transform(email => email.toLowerCase().trim());

// ============================================================================
// Type Guards
// ============================================================================

export function isUserProfileItem(item: UserServiceItem): item is UserProfileItem {
  return item.SK === 'PROFILE';
}

export function isEmailItem(item: UserServiceItem): item is EmailItem {
  return item.SK.startsWith('EMAIL#');
}

// ============================================================================
// Mappers
// ============================================================================

export function toUser(item: UserProfileItem): User {
  return {
    userId: item.userId,
    email: item.email,
    firstName: item.firstName,
    lastName: item.lastName,
    phone: item.phone,
    status: item.status,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function toEmail(item: EmailItem): Email {
  return {
    emailId: item.emailId,
    userId: item.userId,
    email: item.email,
    isPrimary: item.isPrimary,
    isVerified: item.isVerified,
    verifiedAt: item.verifiedAt,
    createdAt: item.createdAt,
  };
}
