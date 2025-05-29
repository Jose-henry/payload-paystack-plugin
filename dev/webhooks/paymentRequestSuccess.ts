// src/webhooks/paymentRequestSuccess.ts
import type { PaystackWebhookHandler } from '../../src/types.js'

export const paymentRequestSuccess: PaystackWebhookHandler = async ({
  event,
  payload,
  pluginConfig,
  req,
}) => {
  // Log the full request details for debugging
  payload.logger.info(`[Paystack Webhook] Received webhook request:`, {
    headers: req.headers,
    method: req.method,
    url: req.url,
    event: event.event,
  })

  // event.data will contain the Paystack payment request object.
  const paystackTransaction = event.data
  // For debugging
  payload.logger.info(
    `[Paystack Webhook] paymentrequest.success: ` + JSON.stringify(paystackTransaction),
  )

  // You will need to decide what field in your transaction collection matches the Paystack transaction (e.g., reference or id)
  // Let's assume you have 'reference' in your collection and 'paystackTransaction.reference'
  try {
    const existing = await payload.find({
      collection: 'transaction',
      where: { reference: { equals: paystackTransaction.reference } },
    })

    const transactionId = existing.docs?.[0]?.id
    if (transactionId) {
      // Update the record with success status and whatever fields you need
      await payload.update({
        collection: 'transaction',
        id: transactionId,
        data: {
          status: 'success', // or whatever matches your schema
          // Optionally, update other fields, e.g. paid_at, amount, etc.
          paid_at: paystackTransaction.paid_at,
          amount: paystackTransaction.amount,
        },
      })
      payload.logger.info(`✅ Updated transaction ${transactionId} with paymentrequest.success`)
    } else {
      // Optionally create a new record if not found
      payload.logger.warn(`No transaction found for reference ${paystackTransaction.reference}`)
    }
  } catch (err) {
    payload.logger.error(`[Paystack Webhook] Error processing paymentrequest.success: ${err}`)
  }
}
