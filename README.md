# User Service

A high-scale, Cognito-authenticated User Service built on AWS Serverless Framework.

## Architecture

- **Runtime**: Node.js 20.x with TypeScript
- **Framework**: Serverless Framework
- **Database**: DynamoDB (single-table design)
- **Auth**: AWS Cognito
- **Events**: Amazon EventBridge
- **IaC**: Terraform (shared resources) + Serverless (Lambda lifecycle)

## Project Structure

```
user-service/
├── src/
│   ├── handlers/        # Lambda handlers
│   │   ├── user/        # User CRUD endpoints
│   │   └── triggers/    # Cognito triggers
│   ├── lib/             # Shared code
│   │   ├── dynamodb/    # DynamoDB client and repository
│   │   ├── events/      # EventBridge publisher
│   │   ├── middleware/  # Middy middleware
│   │   └── types/       # TypeScript interfaces
│   └── utils/           # Utilities (errors, logger)
├── terraform/           # Infrastructure as Code (Cognito, DynamoDB, EventBridge)
├── test-app/            # Browser-based test client for the API
├── tests/               # Unit and integration tests
├── serverless.yml       # Serverless configuration
└── package.json
```

## Prerequisites

- Node.js 20.x
- AWS CLI configured with credentials
- Terraform 1.0+
- Serverless Framework 3.x
- [AWS MCP Server](https://github.com/awslabs/mcp) (optional, for AI-assisted AWS resource management)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Deploy infrastructure (Terraform):
   ```bash
   cd terraform
   terraform init
   terraform apply -var="environment=dev"
   ```

3. Deploy service (Serverless):
   ```bash
   npm run deploy:dev
   ```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /users/me | Get current user profile |
| PUT | /users/me | Update current user profile |
| DELETE | /users/me | Soft delete current user |

All endpoints require a valid Cognito JWT token in the Authorization header.

## Events

The service publishes the following events to EventBridge:

- `user.created` - When a new user confirms their account
- `user.updated` - When a user updates their profile
- `user.deleted` - When a user deletes their account

## Email Verification

The service uses AWS SES for sending verification emails during user signup.

### How It Works

1. User signs up with email and password via Cognito
2. Cognito sends a verification email via SES with a 6-digit code
3. User enters the code in the test app to verify their email
4. On successful verification, the PostConfirmation Lambda trigger creates the user profile in DynamoDB

### Configuration

- **Email Provider**: AWS SES (configured as `DEVELOPER` mode in Cognito)
- **From Address**: `User Service <noreply@your-domain.com>`
- **Email Template**: Custom HTML with styled verification code
- **DKIM/SPF**: Enabled for email authentication

### Limitations (Sandbox Mode)

When SES is in sandbox mode:
- Emails can only be sent to **verified email addresses**
- Maximum 200 emails per 24-hour period
- Maximum 1 email per second

To verify a test email address:
```bash
aws sesv2 create-email-identity --email-identity your-email@example.com
```

For production use, request SES production access via AWS Console.

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Development

```bash
# Lint code
npm run lint

# Format code
npm run format

# Build TypeScript
npm run build
```

## Test App

A browser-based test client is included in `test-app/` for testing the API.

**Live Demo:** [service.esakrissa.com](https://service.esakrissa.com)

### Local Setup

1. Copy the example config:
   ```bash
   cp test-app/config.example.js test-app/config.js
   ```

2. Edit `test-app/config.js` with your deployed values:
   ```javascript
   const CONFIG = {
     API_ENDPOINT: 'https://your-api-id.execute-api.us-east-1.amazonaws.com/dev',
     USER_POOL_ID: 'us-east-1_XXXXXXXXX',
     CLIENT_ID: 'your-cognito-client-id',
     REGION: 'us-east-1'
   };
   ```

3. Open `test-app/index.html` in a browser

## Design Documentation

See the full architecture design at [docs.esakrissa.com](https://docs.esakrissa.com)

## Author

Esa Krissa - [GitHub](https://github.com/esakrissa)
