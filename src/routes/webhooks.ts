import type { PayloadRequest, Config as PayloadConfig } from 'payload'

import { handleWebhooks } from '../webhooks/index.js'
import { PaystackPluginConfig } from 'src/types.js'

export const paystackWebhooks = async (args: {
  req: PayloadRequest
  config: PayloadConfig
  pluginConfig: PaystackPluginConfig
}) => {
  const { req, config, pluginConfig } = args
  const { webhookSecret, webhooks } = pluginConfig

  let returnStatus = 200

  try {
    const rawBody = await req.text?.()
    const signature = req.headers.get('x-paystack-signature')

    if (!signature || !rawBody || !webhookSecret) {
      throw new Error('Invalid webhook signature or missing body')
    }

    const crypto = await import('crypto')
    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (hash !== signature) {
      throw new Error('Webhook signature mismatch')
    }

    const event = JSON.parse(rawBody)

    await handleWebhooks({
      event,
      req,
      config,
      pluginConfig,
      payload: req.payload,
    })

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
    req.payload.logger.error(`⚠️ Paystack webhook error: ${message}`)
    returnStatus = 400
  }

  return Response.json({ received: true }, { status: returnStatus })
}
