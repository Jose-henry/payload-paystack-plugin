# Paystack Plugin for Payload CMS

A Payload CMS plugin that integrates Paystack payment functionality, providing seamless synchronization between your Payload collections and Paystack resources.

## Features

- 🔄 Automatic synchronization of Payload collections with Paystack resources
- 💳 Support for Plans, Products, and Customers
- 🔒 Secure API key handling
- 🌐 Webhook support for real-time updates
- 📊 Read-only collections for Transactions, Refunds, Orders, and Subscriptions
- 💰 Automatic currency handling and conversion
- 🛠️ REST API proxy for direct Paystack API access

## Installation

```bash
npm install paystack-payload-cms
# or
yarn add paystack-payload-cms
# or
pnpm add paystack-payload-cms
```

## Configuration

Add the plugin to your Payload config:

```typescript
import { buildConfig } from 'payload'
import { paystackPlugin } from 'paystack-payload-cms'

export default buildConfig({
  // ... other config
  plugins: [
    paystackPlugin({
      enabled: true,
      paystackSecretKey: process.env.PAYSTACK_SECRET_KEY!,
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
      rest: true,
      logs: true,
      defaultCurrency: 'NGN',
      updateExistingProductsOnCurrencyChange: false,
      sync: [
        {
          collection: 'product',
          paystackResourceType: 'product',
          paystackResourceTypeSingular: 'product',
          fields: [
            { fieldPath: 'name', paystackProperty: 'name' },
            { fieldPath: 'description', paystackProperty: 'description' },
            { fieldPath: 'price', paystackProperty: 'price' },
            { fieldPath: 'quantity', paystackProperty: 'quantity' },
          ],
        },
        {
          collection: 'plan',
          paystackResourceType: 'plan',
          paystackResourceTypeSingular: 'plan',
          fields: [
            { fieldPath: 'title', paystackProperty: 'name' },
            { fieldPath: 'amount', paystackProperty: 'amount' },
          ],
        },
        {
          collection: 'customer',
          paystackResourceType: 'customer',
          paystackResourceTypeSingular: 'customer',
          fields: [
            { fieldPath: 'name', paystackProperty: 'first_name' },
            { fieldPath: 'email', paystackProperty: 'email' },
            { fieldPath: 'lastName', paystackProperty: 'last_name' },
            { fieldPath: 'phone', paystackProperty: 'phone' },
          ],
        },
      ],
    }),
  ],
})
```

## Collection Setup

### Products

```typescript
{
  slug: 'product',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'price',
      type: 'number',
  required: true,
      min: 0,
      hooks: {
        beforeValidate: [
          ({ value, operation }) => (operation === 'create' && value ? value * 100 : value),
        ],
      },
      admin: {
        description: 'Amount in Naira (will be converted to kobo for Paystack)',
      },
    },
    { name: 'quantity', type: 'number', required: true, min: 0, defaultValue: 1 },
  ],
}
```

### Plans

```typescript
{
  slug: 'plan',
  fields: [
    { name: 'title', type: 'text' },
    {
      name: 'amount',
      type: 'number',
      hooks: {
        beforeValidate: [
          ({ value, operation }) => (operation === 'create' && value ? value * 100 : value),
        ],
      },
      admin: {
        description: 'Amount in Naira (will be converted to kobo for Paystack)',
      },
    },
  ],
}
```

### Customers

```typescript
{
  slug: 'customer',
  auth: true,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'lastName', type: 'text' },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
  ],
}
```

## Important Notes

1. **Currency Handling**:
   - Test mode only supports NGN by default
   - Other currencies (USD, GHS, ZAR, KES) need to be enabled in live mode
   - Amounts are automatically converted to kobo (×100) during creation only

2. **ID Management**:
   - Products use numeric IDs
   - Plans use plan codes (e.g., PLN_xxx)
   - Customers use customer codes (e.g., CUS_xxx)

3. **Update Operations**:
   - Updates use PUT method
   - Only changed fields are sent to Paystack
   - Amounts are not converted during updates

4. **Delete Operations**:
   - Uses DELETE method
   - Removes the resource from Paystack

## Environment Variables

```env
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
```

## API Endpoints

The plugin adds the following endpoints:

- `POST /paystack/webhook` - Webhook endpoint for Paystack events
- `POST /paystack/rest` - REST API proxy for direct Paystack API access

## Read-only Collections

The plugin automatically creates read-only collections for:
- Transactions
- Refunds
- Orders
- Subscriptions

These collections are synchronized with Paystack data and cannot be modified directly.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT