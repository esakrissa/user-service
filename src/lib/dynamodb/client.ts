import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// ============================================================================
// DynamoDB Client Configuration
// ============================================================================

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

// ============================================================================
// Document Client with Marshalling Options
// ============================================================================

export const dynamodb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// ============================================================================
// Table Name
// ============================================================================

export const TABLE_NAME = process.env.TABLE_NAME ?? 'dev-user-service';
export const GSI1_INDEX = 'GSI1';
