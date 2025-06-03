import type { CollectionBeforeValidateHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { deepen } from '../utilities/deepen.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'
import { buildPath } from '../utilities/buildPath.js'

export const createNewInPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionBeforeValidateHook =>
  async ({ data, collection, req, operation }) => {
    const syncConfig = pluginConfig.sync?.find((c) => c.collection === collection.slug)
    const logger = new PaystackPluginLogger(req.payload.logger, pluginConfig, 'create')

    // Only log if logs are enabled
    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [create-hook] Operation: ${operation}`)
      logger.info(`[paystack-plugin] [create-hook] HTTP Method: ${req.method}`)
      logger.info(`[paystack-plugin] [create-hook] Has sync config: ${!!syncConfig}`)
      logger.info(`[paystack-plugin] [create-hook] Skip sync: ${!!data?.skipSync}`)
      logger.info(`[paystack-plugin] [create-hook] Test mode: ${!!pluginConfig.testMode}`)
    }

    // Check if this is a create operation and if Payload used POST
    if (
      !syncConfig ||
      data?.skipSync ||
      pluginConfig.testMode ||
      operation !== 'create' ||
      req.method !== 'POST'
    ) {
      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [create-hook] Skipping create hook due to: ${[
            !syncConfig && 'no sync config',
            data?.skipSync && 'skipSync flag',
            pluginConfig.testMode && 'test mode',
            operation !== 'create' && 'not a create operation',
            req.method !== 'POST' && 'not a POST request',
          ]
            .filter(Boolean)
            .join(', ')}`,
        )
      }
      return data
    }

    // 1) Build request body from your field mappings
    const body = deepen(
      syncConfig.fields.reduce(
        (acc, { fieldPath, paystackProperty }) => {
          // Convert amount/price to kobo if it's a monetary field
          const value = (data as any)[fieldPath]
          if (value && (paystackProperty === 'amount' || paystackProperty === 'price')) {
            acc[paystackProperty] = value * 100
          } else {
            acc[paystackProperty] = value
          }
          return acc
        },
        {} as Record<string, any>,
      ),
    )

    // Add currency for products
    if (syncConfig.paystackResourceType === 'product' && pluginConfig.defaultCurrency) {
      body.currency = pluginConfig.defaultCurrency
    }

    if (pluginConfig.logs) {
      logger.info(
        `[paystack-plugin] [create-hook] Creating new ${syncConfig.paystackResourceType} in Paystack`,
      )
      logger.info(`[paystack-plugin] [create-hook] Request body: ${JSON.stringify(body, null, 2)}`)
    }

    // 2) Call Paystack
    const path = buildPath(syncConfig.paystackResourceType as any)
    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [create-hook] Calling Paystack API: ${path}`)
    }
    const response = await paystackProxy({
      path,
      method: 'POST',
      body,
      secretKey: pluginConfig.paystackSecretKey,
      logs: pluginConfig.logs,
    })

    // 3) Grab the correct *_code field (e.g. customer_code, plan_code, etc.)
    const codeField = `${syncConfig.paystackResourceTypeSingular}_code`
    const codeValue = response.data?.[codeField]

    if (response.status >= 200 && response.status < 300 && codeValue) {
      // For products, store the numeric ID instead of the product_code
      if (
        (syncConfig.paystackResourceType === 'product' ||
          syncConfig.paystackResourceType === 'plan') &&
        response.data?.id
      ) {
        data!.paystackID = response.data.id.toString()
      } else {
        data!.paystackID = codeValue
      }
      if (pluginConfig.logs) {
        logger.info(`[paystack-plugin] [create-hook] Created Paystack ID '${data!.paystackID}'`)
      }
    } else {
      logger.error(
        `[paystack-plugin] [create-hook] Error creating Paystack ${syncConfig.paystackResourceType}: ${response.message} - Response: ${JSON.stringify(response)}`,
      )
    }

    return data
  }
