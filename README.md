# Paystack Plugin for Payload CMS

A powerful plugin that integrates Paystack payment gateway functionality into your Payload CMS application. This plugin provides seamless payment processing capabilities, webhook handling, and synchronization features.

## Features

- 🔄 Automatic synchronization between Payload collections and Paystack resources
- 💳 Built-in payment field components
- 🔔 Webhook handling for payment notifications
- 🔌 REST API endpoints for Paystack operations
- 🎨 Customizable UI components
- 🔒 Secure payment processing
- 📝 TypeScript support

## Installation

```bash
npm install paystack-payload-cms
# or
yarn add paystack-payload-cms
# or
pnpm add paystack-payload-cms
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Required
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Optional
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
PAYSTACK_IS_TEST_KEY=true # Set to true for test mode
```

### Plugin Setup

In your Payload config file (e.g., `payload.config.ts`):

```typescript
import { buildConfig } from 'payload/config';
import { paystackPlugin } from 'paystack-payload-cms';

export default buildConfig({
  // ... other config
  plugins: [
    paystackPlugin({
      paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
      isTestKey: process.env.PAYSTACK_IS_TEST_KEY === 'true',
      rest: true, // Enable REST API endpoints
      sync: [
        {
          collection: 'customers', // Your collection slug
          paystackResourceType: 'customers',
          paystackResourceTypeSingular: 'customer',
          fields: [
            {
              fieldPath: 'email',
              paystackProperty: 'email',
            },
            // Add more field mappings as needed
          ],
        },
      ],
    }),
  ],
});
```

## Usage

### Field Types

The plugin provides custom field types for payment integration:

```typescript
{
  type: 'paystackPayment',
  name: 'payment',
  required: true,
}
```

### Webhooks

The plugin automatically sets up webhook handling at `/api/paystack/webhook`. Configure your Paystack webhook URL to point to this endpoint.

### REST API

When enabled, the plugin provides REST API endpoints for Paystack operations:

- POST `/api/paystack/rest` - Proxy for Paystack API calls

### Synchronization

The plugin can automatically sync data between your Payload collections and Paystack resources. Configure the sync options in the plugin configuration to specify which fields should be synchronized.


## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build the plugin
pnpm build

# Run tests
pnpm test
```