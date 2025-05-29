# Paystack Plugin for Payload CMS

A robust [Payload CMS](https://payloadcms.com/) plugin to sync and manage your [Paystack](https://paystack.com/) resources directly from Payload.
Supports two-way sync, REST/webhook integration, and advanced customer blacklisting—with full control over how you manage your collections!

---

## Features

* 🔁 Sync any Payload collection (e.g., products, plans, customers, transactions, etc.) with the equivalent Paystack resource.
* 🌐 Webhook + REST sync: configure webhooks in your Paystack dashboard for incoming changes, and use REST proxy for outgoing calls from Payload.
* 🛑 Blacklist/whitelist customers in Paystack from Payload—optional polling for two-way blacklist status sync.
* 🗂️ Support for **any** collection type: make collections editable or read-only yourself for best data integrity.
* 🛠️ Expose a `/paystack/rest` endpoint for any Paystack API call, directly from your authenticated frontend or backend.
* 🔐 Secure webhook signature verification; logs and error handling.
* 🧪 **Test Mode**: simulate requests without sending to Paystack, for safe development and QA.
* 💡 **No code license**—use as you like!

---

## Installation

```bash
npm install paystack-payload-plugin

# or
yarn add paystack-payload-plugin

# or
pnpm add paystack-payload-plugin

```

---

## Quick Start: Plugin Setup

```ts
import { buildConfig } from 'payload'
import { paystackPlugin, syncBlacklistCustomers } from 'paystack-payload-cms'
import type { PaystackPluginConfig } from 'paystack-payload-cms/types'

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

These collections are synced using the REST proxy, webhook, or manual update logic (as configured in your sync settings).

To enable true two-way sync, use both the REST endpoint and configure the Paystack webhook to point to your Payload API.

---

## Webhooks & Local Development

Set your webhook URL in the Paystack dashboard to:

```
https://xxxx.ngrok.io/paystack/webhook
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
import type { PaystackWebhookHandler } from '{path}/types'

export const refundProcessed: PaystackWebhookHandler = async ({ event, payload }) => {
  if (event.event === 'refund.processed') {
    const refundData = event.data
    payload.logger.info(`Refund processed: ${JSON.stringify(refundData)}`)
    // You may update your 'refund' collection here if you wish
  }
}

// Register in your plugin config:
paystackPlugin({
  // ...other config,
  webhooks: {
    'refund.processed': refundProcessed,
    // ...
  },
})
```

> **Tip:** Most other resource types (product, plan, customer, etc) do NOT have webhook event support.

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
