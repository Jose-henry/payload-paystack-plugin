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
  const { webhookSecret, webhooks, paystackSecretKey, testMode } = pluginConfig
  const logger = new PaystackPluginLogger(req.payload.logger, pluginConfig, 'webhook')

  // Log incoming request details
  logger.info(
    `[Paystack Webhook] Received webhook request - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}, Has Body: ${!!req.body}, Has Webhook Secret: ${!!webhookSecret}, Test Mode: ${testMode}`,
  )

  // If in test mode, just return 200 OK
  if (testMode) {
    logger.info('[Paystack Webhook] Test mode enabled - skipping webhook processing')
    return Response.json({ received: true, testMode: true }, { status: 200 })
  }

  let returnStatus = 200

  try {
    // Get raw body as string for signature verification
    let rawBody: string
    if (typeof req.text === 'function') {
      rawBody = await req.text()
    } else if (req.body) {
      rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    } else {
      throw new Error('No request body found')
    }

    const signature = req.headers.get('x-paystack-signature')

    logger.info(
      `[Paystack Webhook] Processing webhook - Has Signature: ${!!signature}, Has Raw Body: ${!!rawBody}, Has Webhook Secret: ${!!webhookSecret}, Raw Body: ${rawBody}`,
    )

    // If no signature or body, return 200 OK but log warning
    if (!signature || !rawBody) {
      logger.warn(
        `[Paystack Webhook] Missing signature or body - Signature: ${!!signature}, Raw Body: ${!!rawBody}`,
      )
      return Response.json({ received: true }, { status: 200 })
    }

    // If we have a webhook secret, verify the signature
    if (webhookSecret) {
      const crypto = await import('crypto')
      const hash = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex')

      logger.info(`[Paystack Webhook] Generated hash: ${hash}, Received signature: ${signature}`)

      if (hash !== signature) {
        logger.error(
          `[Paystack Webhook] Signature mismatch - Generated: ${hash}, Received: ${signature}`,
        )
        throw new Error('Webhook signature mismatch')
      }
    }

    // Parse the event data
    const event = JSON.parse(rawBody)
    logger.info(
      `[Paystack Webhook] Event received: ${event.event}, Data: ${JSON.stringify(event.data)}`,
    )

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
      logger.info(`[Paystack Webhook] Running custom webhook handler function`)
      await webhooks({
        event,
        req,
        config,
        pluginConfig,
        payload: req.payload,
      })
    } else if (typeof webhooks === 'object' && typeof webhooks[event.event] === 'function') {
      logger.info(`[Paystack Webhook] Running custom webhook handler for event: ${event.event}`)
      await webhooks[event.event]({
        event,
        req,
        config,
        pluginConfig,
        payload: req.payload,
      })
    } else {
      logger.info(`[Paystack Webhook] No custom handler found for event: ${event.event}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`⚠️ Paystack webhook error: ${message}`)
    returnStatus = 400
  }

  logger.info(`[Paystack Webhook] Returning response with status: ${returnStatus}`)
  return Response.json({ received: true }, { status: returnStatus })
}
