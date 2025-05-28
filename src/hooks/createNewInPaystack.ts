// src/hooks/createNewInPaystack.ts
import type { CollectionBeforeValidateHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { deepen } from '../utilities/deepen.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'
import { buildPath } from '../routes/rest.js'

export const createNewInPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionBeforeValidateHook =>
  async ({ data, collection, req }) => {
    const syncConfig = pluginConfig.sync?.find((c) => c.collection === collection.slug)
    const logger = new PaystackPluginLogger(req.payload.logger, 'create')

    // Debug logging
    logger.info(`[paystack-plugin] [debug] Has sync config: ${!!syncConfig}`)
    logger.info(`[paystack-plugin] [debug] Skip sync: ${!!data?.skipSync}`)
    logger.info(`[paystack-plugin] [debug] Test mode: ${!!pluginConfig.testMode}`)

    if (!syncConfig || data?.skipSync || pluginConfig.testMode) {
      logger.info(
        `[paystack-plugin] [debug] Skipping create hook due to: ${[
          !syncConfig && 'no sync config',
          data?.skipSync && 'skipSync flag',
          pluginConfig.testMode && 'test mode',
        ]
          .filter(Boolean)
          .join(', ')}`,
      )
      return data
    }

    // 1) Build request body from your field mappings
    const body = deepen(
      syncConfig.fields.reduce(
        (acc, { fieldPath, paystackProperty }) => {
          acc[paystackProperty] = (data as any)[fieldPath]
          return acc
        },
        {} as Record<string, any>,
      ),
    )

    // Add currency for products
    if (syncConfig.paystackResourceType === 'product' && pluginConfig.defaultCurrency) {
      body.currency = pluginConfig.defaultCurrency
    }

    logger.info(
      `[paystack-plugin] [debug] Creating new ${syncConfig.paystackResourceType} in Paystack`,
    )
    logger.info(`[paystack-plugin] [debug] Request body: ${JSON.stringify(body, null, 2)}`)

    // 2) Call Paystack
    const path = buildPath(syncConfig.paystackResourceType as any)
    logger.info(`[paystack-plugin] [debug] Calling Paystack API: ${path}`)
    const response = await paystackProxy({
      path,
      method: 'POST',
      body,
      secretKey: pluginConfig.paystackSecretKey,
    })

    // 3) Grab the correct *_code field (e.g. customer_code, plan_code, etc.)
    const codeField = `${syncConfig.paystackResourceTypeSingular}_code`
    const codeValue = response.data?.[codeField]

    if (response.status >= 200 && response.status < 300 && codeValue) {
      // For products, store the numeric ID instead of the product_code
      if (syncConfig.paystackResourceType === 'product' && response.data?.id) {
        data!.paystackID = response.data.id.toString()
      } else {
        data!.paystackID = codeValue
      }
      if (pluginConfig.logs) {
        logger.info(`[paystack-plugin] Created Paystack ID '${data!.paystackID}'`)
      }
    } else {
      logger.error(
        `[paystack-plugin] Error creating Paystack ${syncConfig.paystackResourceType}: ${response.message} - Response: ${JSON.stringify(response)}`,
      )
    }

    return data
  }
