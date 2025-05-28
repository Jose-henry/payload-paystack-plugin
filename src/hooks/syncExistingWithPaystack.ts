import type { CollectionAfterChangeHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { deepen } from '../utilities/deepen.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'
import { buildPath } from '../routes/rest.js'

export const syncExistingWithPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, operation, collection, req }) => {
    const syncConfig = pluginConfig.sync?.find((c) => c.collection === collection.slug)
    const logger = new PaystackPluginLogger(req.payload.logger, 'update')

    // Only log if logs are enabled
    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [update-hook] Operation: ${operation}`)
      logger.info(`[paystack-plugin] [update-hook] HTTP Method: ${req.method}`)
      logger.info(`[paystack-plugin] [update-hook] Has sync config: ${!!syncConfig}`)
      logger.info(`[paystack-plugin] [update-hook] Skip sync: ${!!doc.skipSync}`)
      logger.info(`[paystack-plugin] [update-hook] Test mode: ${!!pluginConfig.testMode}`)
    }

    // Check if this is an update operation and if Payload used PATCH
    if (
      !syncConfig ||
      pluginConfig.testMode ||
      doc.skipSync ||
      operation !== 'update' ||
      req.method !== 'PATCH'
    ) {
      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] Skipping sync hook due to: ${[
            !syncConfig && 'no sync config',
            pluginConfig.testMode && 'test mode',
            doc.skipSync && 'skipSync flag',
            operation !== 'update' && 'not an update operation',
            req.method !== 'PATCH' && 'not a PATCH request',
          ]
            .filter(Boolean)
            .join(', ')}`,
        )
      }
      return doc
    }

    if (pluginConfig.logs) {
      logger.info(
        `[paystack-plugin] [update-hook] Updating '${collection.slug}' ID '${doc.paystackID}'`,
      )
    }

    // Only include fields that actually changed
    const toUpdate = deepen(
      syncConfig.fields.reduce(
        (acc, { fieldPath, paystackProperty }) => {
          if (doc[fieldPath] !== previousDoc[fieldPath]) {
            // Convert amount/price to kobo if it's a monetary field
            const value = doc[fieldPath]
            if (value && (paystackProperty === 'amount' || paystackProperty === 'price')) {
              acc[paystackProperty] = value * 100
            } else {
              acc[paystackProperty] = value
            }
          }
          return acc
        },
        {} as Record<string, any>,
      ),
    )

    // Add currency for products if it's not already included
    if (
      syncConfig.paystackResourceType === 'product' &&
      pluginConfig.defaultCurrency &&
      !toUpdate.currency
    ) {
      toUpdate.currency = pluginConfig.defaultCurrency
    }

    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [update-hook] Fields to update: ${JSON.stringify(toUpdate)}`)
    }

    if (Object.keys(toUpdate).length) {
      // Use PUT for Paystack API even though Payload uses PATCH internally
      const path = buildPath(syncConfig.paystackResourceType as any, doc.paystackID, 'PUT')
      if (pluginConfig.logs) {
        logger.info(`[paystack-plugin] [update-hook] Calling Paystack API: ${path}`)
      }
      const response = await paystackProxy({
        path,
        method: 'PUT', // Always use PUT for Paystack API updates
        body: toUpdate,
        secretKey: pluginConfig.paystackSecretKey,
        logs: pluginConfig.logs,
      })

      if (response.status >= 200 && response.status < 300) {
        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] [update-hook] Updated Paystack ID '${doc.paystackID}'`)
        }
      } else {
        logger.error(
          `[paystack-plugin] [update-hook] Error updating Paystack ${syncConfig.paystackResourceType}: ${response.message}`,
        )
      }
    } else if (pluginConfig.logs) {
      logger.info(
        `[paystack-plugin] [update-hook] No changes to sync for Paystack ID '${doc.paystackID}'`,
      )
    }

    return doc
  }
