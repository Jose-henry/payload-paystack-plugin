# Paystack Plugin for Payload CMS

A robust [Payload CMS](https://payloadcms.com/) plugin to sync and manage your [Paystack](https://paystack.com/) resources directly from Payload.
Supports two-way sync, REST/webhook integration, and advanced customer blacklisting—with full control over how you manage your collections!

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Jose-henry/payload-paystack-plugin)
[![GitHub Stars](https://img.shields.io/github/stars/Jose-henry/payload-paystack-plugin?style=social)](https://github.com/Jose-henry/payload-paystack-plugin/stargazers)

⭐ **Star this repository** if you find it useful! Your support helps the project grow and encourages further development.

> **⚠️ IMPORTANT: TypeScript Declaration**  
> To avoid TypeScript declaration errors if you have, create a file named `paystack-payload-plugin.d.ts` in your project's root or `src` directory with the following content:
> ```typescript
> declare module 'paystack-payload-plugin';
> ```
> This will resolve any TypeScript declaration errors when using the plugin.

> **⚠️ IMPORTANT UPDATE NOTE**  
> **Changes not HMR and importMap issues have been fixed in the latest version.**  
> If you were experiencing issues with Hot Module Replacement (HMR) or importMap configuration, please update to the latest version.

---

## Features

* 🔁 Sync any Payload collection (e.g., products, plans, customers, transactions, etc.) with the equivalent Paystack resource.
* 🌐 Webhook + REST sync: configure webhooks in your Paystack dashboard for incoming changes, and use REST proxy for outgoing calls from Payload.
* 🛑 Blacklist/whitelist customers in Paystack from Payload—optional polling for two-way blacklist status sync.
* 🗂️ Support for **any** collection type: make collections editable or read-only yourself for best data integrity.
* 🛠️ Expose a `/paystack/rest` endpoint for any Paystack API call, directly from your authenticated frontend or backend.
* 🔐 Secure webhook signature verification; logs and error handling.
* 🧪 **Test Mode**: simulate requests without sending to Paystack, for safe development and QA.


---

## Installation

```bash
npm install paystack-payload-plugin
# or
yarn add paystack-payload-plugin
# or
pnpm add paystack-payload-plugin
```

After installation, run:
```bash
npx payload generate:importmap
```

This ensures proper module resolution for the plugin.

## Troubleshooting Installation

If you encounter installation issues, try these solutions:

1. **Using pnpm (Recommended)**
   ```bash
   pnpm add paystack-payload-plugin@latest
   ```

2. **Using npm with legacy peer deps**
   ```bash
   npm install paystack-payload-plugin@latest --legacy-peer-deps
   ```

3. **Clear npm cache and retry**
   ```bash
   npm cache clean --force
   npm install paystack-payload-plugin@latest
   ```

4. **Install directly from GitHub**
   ```bash
   npm install github:Jose-henry/payload-paystack-plugin
   ```

If you're still experiencing issues, please:
1. Check your Node.js version (requires Node.js ^18.20.2 or >=20.9.0)
2. Ensure you're using a compatible package manager (npm, yarn, or pnpm)
3. Open an issue on GitHub with your error message and environment details

### Common Warnings

If you see warnings about peer dependencies or build scripts, these are normal and won't affect functionality:

1. **Peer Dependency Warnings**
   - If you see warnings about React versions, these are expected
   - The plugin supports React versions 16.8.0 through 19.x
   - These warnings can be safely ignored

2. **Build Script Warnings**
   - If using pnpm, you might see warnings about ignored build scripts
   - This is a security feature of pnpm
   - Run `pnpm approve-builds` if you need to allow specific build scripts

### Package Manager Compatibility

The plugin is compatible with all major package managers, but each has its own requirements:

1. **npm**
   - Requires npm version 7 or higher
   - If you encounter the "Cannot read properties of null (reading 'matches')" error:
     ```bash
     # First, clear npm cache
     npm cache clean --force
     
     # Then try installing with legacy peer deps
     npm install paystack-payload-plugin@latest --legacy-peer-deps
     
     # If that doesn't work, try with force
     npm install paystack-payload-plugin@latest --force
     ```

2. **pnpm (Recommended)**
   - Works out of the box
   - Use `pnpm add paystack-payload-plugin@latest`
   - Best compatibility with the plugin's configuration



### Common Installation Issues

1. **npm "matches" Error**
   - This is a known npm issue with dependency resolution
   - Try the solutions above in order:
     1. Clear npm cache and retry
     2. Use --legacy-peer-deps
     3. Use --force
     4. Switch to pnpm (recommended)

2. **TypeScript Errors**
   - Make sure you have TypeScript installed in your project
   - The plugin requires TypeScript 4.5 or higher

3. **Peer Dependency Warnings**
   - These are normal and won't affect functionality
   - The plugin supports React 16.8 through 19.x

---

## Quick Start: Plugin Setup

```ts
import { buildConfig } from 'payload'
import { paystackPlugin } from 'paystack-payload-plugin'
import type { PaystackPluginConfig } from 'paystack-payload-plugin/types'

export default buildConfig({
  // ...your config
  plugins: [
    paystackPlugin({
      paystackSecretKey: process.env.PAYSTACK_SECRET_KEY!,
      webhookSecret: process.env.PAYSTACK_SECRET_KEY!,
      rest: true,
      logs: true,
      blacklistCustomerOption: true,
      testMode: false,
      defaultCurrency: 'NGN',
      pollingInterval: 60 * 60 * 1000,
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
        {
          collection: 'transaction',
          paystackResourceType: 'transaction',
          paystackResourceTypeSingular: 'transaction',
          fields: [
            { fieldPath: 'paystackID', paystackProperty: 'id' },
            { fieldPath: 'status', paystackProperty: 'status' },
            { fieldPath: 'reference', paystackProperty: 'reference' },
            { fieldPath: 'amount', paystackProperty: 'amount' },
            { fieldPath: 'currency', paystackProperty: 'currency' },
            { fieldPath: 'paid_at', paystackProperty: 'paid_at' },
            // The following fields use webhook events with nested values:
            { fieldPath: 'customer_code', paystackProperty: 'customer.customer_code' }, // nested: customer.customer_code
            { fieldPath: 'channel', paystackProperty: 'channel' },
            { fieldPath: 'customer_first_name', paystackProperty: 'customer.first_name' }, // nested: customer.first_name
            { fieldPath: 'customer_last_name', paystackProperty: 'customer.last_name' },   // nested: customer.last_name
            { fieldPath: 'customer_email', paystackProperty: 'customer.email' },           // nested: customer.email
          ],
        },
      ],
    }),
  ],
})
```

---

## How Collection Sync Works

You control your Payload collections—make them editable or read-only as you wish.

**Example: Making a Collection Read-Only**

```ts
{
  slug: 'transaction',
  access: {
    create: () => false,
    update: () => false,
    delete: () => false,
    read: () => true,
  },
  fields: [
    { name: 'status', type: 'text' },
    { name: 'reference', type: 'text' },
    { name: 'amount', type: 'number' },
    { name: 'currency', type: 'text' },
  ],
}
```

These collections are synced using the REST proxy, webhook, or manual update logic on payload (as configured in your sync settings).

To enable true two-way sync, use both the REST endpoint and configure the Paystack webhook to point to your Payload API.

---

## Webhooks & Local Development

Set your webhook URL in the Paystack dashboard to:

```
https://xxxx.ngrok.io/api/paystack/webhook
```

Use the same value for `paystackSecretKey` and `webhookSecret` (usually your Paystack secret key).

On localhost, run:

Follow and Read [ngrok docs](https://dashboard.ngrok.com/get-started), to create a local domain

and use the public URL in your Paystack dashboard.

---

## REST Proxy Usage Example

```ts
await fetch('/paystack/rest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    paystackPath: '/transaction/initialize',
    paystackMethod: 'POST',
    paystackArgs: [{ email: "demo@test.com", amount: 20000 }],
  }),
});
```

You can use any Paystack API path and method.
The request will be proxied using your secret key.

---

## Alternative Ways to Make Paystack API Requests

Besides using the REST proxy endpoint, you have two other options to interact with Paystack:

1. **Direct Paystack API Calls:**
   ```ts
   // Using fetch
   await fetch('https://api.paystack.co/transaction/initialize', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       email: 'customer@email.com',
       amount: 20000
     })
   });
   ```

2. **Using the paystackProxy Utility:**
   ```ts
   import { paystackProxy } from 'paystack-payload-plugin/utilities';
   
   // Make API calls using the proxy function
   const response = await paystackProxy({
      path: '/transaction/initialize',
      method: 'POST',
      body: { email: 'customer@email.com', amount: 20000 },
      secretKey:  process.env.PAYSTACK_SECRET_KEY!,
    })
   ```

The `paystackProxy` utility provides a convenient way to make Paystack API calls while maintaining consistent error handling and authentication. It's particularly useful when you want to make Paystack API calls from your backend code without exposing the REST endpoint.

---

## Security Considerations for REST Proxy

**⚠️ Important Security Note:**

Setting `rest: true` in your plugin configuration opens up the `/api/paystack/rest` endpoint, allowing authenticated users to directly interact with the Paystack REST API. While this might be convenient for development, in production it poses a security risk because any authenticated user would have unrestricted access to Paystack's API. This could lead to unintended actions or data exposure.

### Best Practices for REST Proxy Usage:

1. **Development vs Production:**
   - In development: Using `rest: true` is acceptable for testing and development purposes
   - In production: Consider creating your own secure endpoints instead of using the REST proxy

2. **Alternative Approaches:**
   - Create specific endpoints for your Paystack operations
   - Use the Paystack SDK directly in your backend code
   - Implement proper access controls and rate limiting
   - Validate all requests before forwarding them to Paystack


Remember: The REST proxy is a powerful feature that should be used with caution. Always prioritize security over convenience in production environments.

---

## Customer Blacklisting

When `blacklistCustomerOption: true`, a "Blacklisted on Paystack" checkbox appears in the Payload admin sidebar for the customer collection.

**About Polling**

Because Paystack does not send webhooks for customer blacklist/risk status changes, this plugin includes a built-in background polling mechanism (runs on server start and at your chosen interval if enabled). Polling ensures that customer blacklist status in Payload stays in sync with Paystack. Polling only happens if youve set its parameter in plugin config to true

pollingInterval controls how often the sync runs (in milliseconds).

pollingRunImmediately (default: false) controls whether the polling runs once as soon as Payload starts.

You do NOT need to manually call any polling function in your Payload config. The plugin does this automatically.

Deleting a customer in Payload sets `risk_action: "deny"` in Paystack.

### Important Note About Deletion

Deleting a record in Payload is a destructive process that will:

1. Delete the record from Payload
2. If the record has a `paystackID`, attempt to delete/blacklist it in Paystack
3. This happens regardless of whether `skipSync` was checked during creation

The `skipSync` flag only prevents creation/updates in Paystack, but deletion will still be attempted if a `paystackID` exists.

### Limitations:

* Paystack does **not** support actual customer deletion via API.
* No webhook is emitted for risk\_action changes; polling is the only method to sync blacklist status.

---

## Webhook Support: Limitations and Usage

**⚠️ NOTE:**

> As of 2024, Paystack webhooks only support a limited number of event types (see below). This means **most collections cannot be synced from Paystack to Payload via webhook.**
>
> **For best data integrity, always make changes in Payload (not Paystack),** since webhooks will NOT cover most update scenarios (e.g., customer, plan, or product changes). We recommend treating Payload as your "single source of truth."

### Supported Paystack Events (as of May 2024)

| Event Name                      | Example Usage                      |
| ------------------------------- | ---------------------------------- |
| charge.dispute.create           | Disputes                           |
| charge.dispute.remind           | Disputes                           |
| charge.dispute.resolve          | Disputes                           |
| charge.success                  | Transaction success (e.g., orders) |
| customeridentification.failed   | KYC/ID validation failed           |
| customeridentification.success  | KYC/ID validation passed           |
| dedicatedaccount.assign.failed  | DVA (dedicated virtual account)    |
| dedicatedaccount.assign.success | DVA assigned                       |
| invoice.create                  | Invoice for a subscription         |
| invoice.payment\_failed         | Invoice payment failed             |
| invoice.update                  | Invoice updated/charged            |
| paymentrequest.pending          | Payment request sent               |
| paymentrequest.success          | Payment request paid               |
| refund.failed                   | Refund failed                      |
| refund.pending                  | Refund pending                     |
| refund.processed                | Refund processed                   |
| refund.processing               | Refund processing                  |
| subscription.create             | Subscription created               |
| subscription.disable            | Subscription disabled              |
| subscription.expiring\_cards    | Card for sub expiring              |
| subscription.not\_renew         | Sub won't auto-renew               |
| transfer.failed                 | Transfer failed                    |
| transfer.success                | Transfer success                   |
| transfer.reversed               | Transfer reversed                  |

**See:** [Paystack Webhook Docs](https://paystack.com/docs/payments/webhooks/#events)

### Example: Writing a Webhook Handler

To handle a supported webhook event, pass a handler to the plugin config. Here's an example that logs refunds processed:

```ts
import type { PaystackWebhookHandler } from '{plugin-name}/types.js'

export const chargeSuccess: PaystackWebhookHandler = async ({
  event,
  payload,
  pluginConfig,
  req,
}) => {
  // Log the full request details for debugging
  payload.logger.info(`[Paystack Webhook] Processing charge.success event:`, {
    reference: event.data.reference,
    amount: event.data.amount,
    status: event.data.status,
  })

  try {
    const transaction = event.data
    // Create or update transaction record
    const existing = await payload.find({
      collection: 'transaction',
      where: { reference: { equals: transaction.reference } },
    })

    if (existing.docs?.length > 0) {
      await payload.update({
        collection: 'transaction',
        id: existing.docs[0].id,
        data: {
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          paid_at: transaction.paid_at,
          customer_code: transaction.customer?.customer_code,
          channel: transaction.channel,
        },
      })
      payload.logger.info(`✅ Updated transaction ${transaction.reference}`)
    } else {
      await payload.create({
        collection: 'transaction',
        data: {
          status: transaction.status,
          reference: transaction.reference,
          amount: transaction.amount,
          currency: transaction.currency,
          paid_at: transaction.paid_at,
          customer_code: transaction.customer?.customer_code,
          channel: transaction.channel,
        },
      })
      payload.logger.info(`✅ Created new transaction ${transaction.reference}`)
    }
  } catch (err) {
    payload.logger.error(`❌ Error processing charge.success: ${err}`)
  }
}


// Register in your plugin config:
paystackPlugin({
  // ...other config,
  webhooks: {
     'charge.success': chargeSuccess,
    // ...
  },
})
```
Example event data:
Here is the data in a nicely formatted JSON:

```json
{
  "event": "charge.success",
  "data": {
    "id": 5025288020569,
    "domain": "test",
    "status": "success",
    "reference": "ie54rnrehtrd",
    "amount": 1000,
    "message": null,
    "gateway_response": "Successful",
    "paid_at": "2025-06-03T14:17:44.000Z",
    "created_at": "2025-06-03T14:17:31.000Z",
    "channel": "card",
    "currency": "NGN",
    "ip_address": "132.247.137.240",
    "metadata": "",
    "fees_breakdown": null,
    "log": null,
    "fees": 15,
    "fees_split": null,
    "authorization": {
      "authorization_code": "AUTH_mxcnr5432q",
      "bin": "408408",
      "last4": "4081",
      "exp_month": "12",
      "exp_year": "2030",
      "channel": "card",
      "card_type": "visa",
      "bank": "TEST BANK",
      "country_code": "NG",
      "brand": "visa",
      "reusable": true,
      "signature": "SIG_2X409u7rWzEMBBp95CaN",
      "account_name": null
    },
    "customer": {
      "id": 2784703341,
      "first_name": null,
      "last_name": null,
      "email": "josephhenry@gmail.com",
      "customer_code": "CUS_2rxuhf44dda4rwk8jxi",
      "phone": null,
      "metadata": null,
      "risk_action": "default",
      "international_format_phone": null
    },
    "plan": {},
    "subaccount": {},
    "split": {},
    "order_id": null,
    "paidAt": "2025-06-03T14:17:44.000Z",
    "requested_amount": 100,
    "pos_transaction_data": null,
    "source": {
      "type": "api",
      "source": "merchant_api",
      "entry_point": "transaction_initialize",
      "identifier": null
    }
  }
}
```




> **Tip:** Most other resource types (product, plan, customer, etc) do NOT have webhook event support, but you can verify this by reading all the data from events, they send alot.

---

## ⚠️ Important: Collection Identifiers for Webhook Sync

To ensure the out-of-the-box webhook sync works correctly, your Payload collections **must include the correct identifier field** for each Paystack resource you want to sync. For example:

- Some Paystack events/resources use a unique `paystackID` (e.g., `id`, `customer_code`, etc.).
- Others (like `charge.success` for transactions) use a `reference` field as the unique identifier.

**You must:**
- Add the appropriate identifier field (e.g., `paystackID` or `reference`) to your Payload collection schema.
- Include that field in your plugin sync config's `fields` array (e.g., `{ fieldPath: 'reference', paystackProperty: 'reference' }`).
- Refer to [Paystack documentation](https://paystack.com/docs/payments/webhooks/#events) to determine which identifier is required for each event/resource type.

If neither identifier is present in the event data or your collection, the plugin will log a warning and skip syncing for that event.

---

## Plugin Options

| Option                           | Type    | Description                                                                                       |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| paystackSecretKey                | string  | **Required.** Your Paystack API key.                                                              |
| webhookSecret                    | string  | Webhook verification secret (usually same as secret key).                                         |
| rest                             | boolean | Expose `/paystack/rest` proxy endpoint.                                                           |
| logs                             | boolean | Enable verbose logs.                                                                              |
| blacklistCustomerOption          | boolean | Enables blacklisting UI and polling support.                                                      |
| pollingInterval                  | number  | Interval in ms for polling (default: 1 hour).                                                     |
| pollingPageSize, pollingMaxPages | number  | Control paging for polling.                                                                       |
| defaultCurrency                  | string  | Currency code, default: 'NGN'.                                                                    |
| sync                             | array   | List of collections and Paystack mappings.                                                        |
| testMode                         | boolean | If true, requests are simulated and **not** sent to Paystack—useful for safe development/testing! |

---

## Test Keys, Live Keys, and Test Mode

* **Test Keys (`sk_test_xxx`)**: Use in test mode during development.
* **Live Keys (`sk_live_xxx`)**: Use in production only.

### `testMode` Parameter

* `true`: Simulate all requests (safe for development/testing).
* `false` (default): Send requests to Paystack.

### Environment Variables

```env
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_WEBHOOK_SECRET=sk_test_xxx
# or for live:
# PAYSTACK_SECRET_KEY=sk_live_xxx
# PAYSTACK_WEBHOOK_SECRET=sk_live_xxx
```

---

## FAQs and Troubleshooting

**Q: Why aren't my customers deleted from Paystack?**
A: Deletion is not supported via API; Payload deletion only blacklists the customer.

**Q: How do I make a collection read-only?**
A: Use the `access` property in your Payload config.

**Q: Why do I need to poll for blacklist status?**
A: Paystack does not emit webhooks for `risk_action` changes.

**Q: How do I sync only some fields?**
A: Use the `fields` mapping in your sync config.

**Q: I get webhook signature errors!**
A: Use the same key for `paystackSecretKey` and `webhookSecret`.

---

## Final Notes

* **Changes made in Paystack will NOT sync back to Payload for most collections** (except for the supported webhook events above).
* For reliability, always make your changes in Payload, not Paystack.
* Read the [Paystack API Docs](https://paystack.com/docs/api) and [Webhook Docs](https://paystack.com/docs/payments/webhooks/#events) for more info and updates.

---

Happy coding! 🚀

---

## License

MIT License

