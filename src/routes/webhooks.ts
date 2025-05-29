import type { PayloadRequest, Config as PayloadConfig } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { handleWebhooks } from '../webhooks/index.js'
import { PaystackPluginLogger } from '../utilities/logger.js'

/**
 * Paystack webhook endpoint. Verifies signature,
 * always performs native sync (for read-only collections),
 * and then runs user custom handler if present.
 */
export const paystackWebhooks = async (args: {
  req: PayloadRequest
  config: PayloadConfig
  pluginConfig: PaystackPluginConfig
}) => {
  const { req, config, pluginConfig } = args
  const { webhookSecret, webhooks } = pluginConfig
  const logger = new PaystackPluginLogger(req.payload.logger, 'webhook')

  // Log incoming request details
  logger.info(
    `[Paystack Webhook] Received webhook request - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}, Has Body: ${!!req.body}, Has Webhook Secret: ${!!webhookSecret}`,
  )

  let returnStatus = 200

  try {
    const rawBody = await req.text?.()
    const signature = req.headers.get('x-paystack-signature')

    logger.info(
      `[Paystack Webhook] Processing webhook - Has Signature: ${!!signature}, Has Raw Body: ${!!rawBody}, Has Webhook Secret: ${!!webhookSecret}`,
    )

    if (!signature || !rawBody || !webhookSecret) {
      throw new Error('Invalid webhook signature or missing body')
    }

    const crypto = await import('crypto')
    const hash = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex')

    if (hash !== signature) {
      throw new Error('Webhook signature mismatch')
    }

    const event = JSON.parse(rawBody)
    logger.info(`[Paystack Webhook] Event received: ${event.event}`)

    // --- (1) Native sync for read-only collections & any configured collection ---
    await handleWebhooks({
      event,
      req,
      config,
      pluginConfig,
      payload: req.payload,
    })

    // --- (2) User custom webhook handler support (function or map of events) ---
    if (typeof webhooks === 'function') {
      await webhooks({
        event,
        req,
        config,
        pluginConfig,
        payload: req.payload,
      })
    } else if (typeof webhooks === 'object' && typeof webhooks[event.event] === 'function') {
      await webhooks[event.event]({
        event,
        req,
        config,
        pluginConfig,
        payload: req.payload,
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`⚠️ Paystack webhook error: ${message}`)
    returnStatus = 400
  }

  return Response.json({ received: true }, { status: returnStatus })
}
