// src/hooks/syncExistingWithPaystack.ts
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

    // Debug logging
    logger.info(`[paystack-plugin] [debug] Operation: ${operation}`)
    logger.info(`[paystack-plugin] [debug] Has sync config: ${!!syncConfig}`)
    logger.info(`[paystack-plugin] [debug] Skip sync: ${!!doc.skipSync}`)
    logger.info(`[paystack-plugin] [debug] Test mode: ${!!pluginConfig.testMode}`)

    if (!syncConfig || pluginConfig.testMode || doc.skipSync || operation !== 'update') {
      logger.info(
        `[paystack-plugin] [debug] Skipping sync hook due to: ${[
          !syncConfig && 'no sync config',
          pluginConfig.testMode && 'test mode',
          doc.skipSync && 'skipSync flag',
          operation !== 'update' && 'create operation (use createNewInPaystack hook instead)',
        ]
          .filter(Boolean)
          .join(', ')}`,
      )
      return doc
    }

    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [sync] Updating '${collection.slug}' ID '${doc.paystackID}'`)
    }

    // Only include fields that actually changed
    const toUpdate = deepen(
      syncConfig.fields.reduce(
        (acc, { fieldPath, paystackProperty }) => {
          if (doc[fieldPath] !== previousDoc[fieldPath]) {
            acc[paystackProperty] = doc[fieldPath]
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

    logger.info(`[paystack-plugin] [debug] Fields to update: ${JSON.stringify(toUpdate)}`)

    if (Object.keys(toUpdate).length) {
      const path = buildPath(syncConfig.paystackResourceType as any, doc.paystackID, 'PUT')
      logger.info(`[paystack-plugin] [debug] Calling Paystack API: ${path}`)
      const response = await paystackProxy({
        path,
        method: 'PUT',
        body: toUpdate,
        secretKey: pluginConfig.paystackSecretKey,
      })

      if (response.status >= 200 && response.status < 300) {
        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] Updated Paystack ID '${doc.paystackID}'`)
        }
      } else {
        logger.error(
          `[paystack-plugin] Error updating Paystack ${syncConfig.paystackResourceType}: ${response.message}`,
        )
      }
    } else if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] No changes to sync for Paystack ID '${doc.paystackID}'`)
    }

    return doc
  }
