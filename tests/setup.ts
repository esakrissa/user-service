// Jest setup file
// Add any global test setup here

// Set test environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.TABLE_NAME = 'test-user-service';
process.env.EVENT_BUS_NAME = 'test-user-service';
process.env.STAGE = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);
