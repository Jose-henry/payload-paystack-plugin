import type { PaystackWebhookHandler } from '../../src/types.js'

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
