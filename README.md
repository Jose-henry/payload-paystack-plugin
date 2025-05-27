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
      testMode: true, // Enable test mode to prevent real API calls
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

## Amount Handling

Paystack uses subunits (e.g., kobo for NGN, cents for USD) for all monetary values. The plugin automatically handles this conversion:

- When you enter an amount in base currency (e.g., 100 NGN) in Payload
- The plugin converts it to subunits (100 * 100 = 10000 kobo) before sending to Paystack
- Paystack displays the amount correctly in base currency in their dashboard

Supported Currencies:
- NGN (Nigerian Naira) - subunit: Kobo (1 NGN = 100 kobo)
- USD (US Dollar) - subunit: Cent (1 USD = 100 cents)
- GHS (Ghanaian Cedi) - subunit: Pesewa (1 GHS = 100 pesewas)
- ZAR (South African Rand) - subunit: Cent (1 ZAR = 100 cents)
- KES (Kenyan Shilling) - subunit: Cent (1 KES = 100 cents)

For example with NGN:
- Enter: 100 NGN in Payload
- Stored/Sent: 10000 kobo to Paystack
- Displayed: 100 NGN in Paystack dashboard

This conversion is handled automatically for:
- Plan amounts
- Product prices
- Any other monetary fields synced with Paystack

Note: Products require a currency. You can:

1. Set a default currency in the plugin config:
```typescript
paystackPlugin({
  // ... other config
  defaultCurrency: 'NGN', // or 'USD', 'GHS', 'ZAR', 'KES'
})
```

2. Optionally update all existing products when changing currency:
```typescript
paystackPlugin({
  // ... other config
  defaultCurrency: 'USD',
  updateExistingProductsOnCurrencyChange: true, // Updates all products in Paystack
})
```

⚠️ Warning: Enabling `updateExistingProductsOnCurrencyChange` will update ALL products in Paystack with the new currency. Use with caution as this may affect existing orders and transactions.

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

## Configuration Options

- **paystackSecretKey** (required): your SK  
- **webhookSecret** (optional): to verify incoming webhooks  
- **rest**: `true` to enable REST proxy  
- **logs**: `true` for detailed console logs  
- **testMode**: `true` to prevent real API calls to Paystack (useful for testing and development)
- **sync**: array of `{ collection, paystackResourceType, paystackResourceTypeSingular, fields }`  
- **resourceSlugs** (optional): override default slugs for read-only collections