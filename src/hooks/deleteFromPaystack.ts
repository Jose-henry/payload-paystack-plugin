// src/hooks/deleteFromPaystack.ts
import type { CollectionAfterDeleteHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'
import { buildPath } from '../routes/rest.js'

export const deleteFromPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionAfterDeleteHook =>
  async ({ doc, collection, req }) => {
    const syncConfig = pluginConfig.sync?.find((c) => c.collection === collection.slug)
    const logger = new PaystackPluginLogger(req.payload.logger, 'delete')

    // Only log if logs are enabled
    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [debug] Has sync config: ${!!syncConfig}`)
      logger.info(`[paystack-plugin] [debug] Skip sync: ${!!doc.skipSync}`)
      logger.info(`[paystack-plugin] [debug] Test mode: ${!!pluginConfig.testMode}`)
    }

    // Only synced collections
    if (!syncConfig || pluginConfig.testMode) {
      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [debug] Skipping delete hook due to: ${[
            !syncConfig && 'no sync config',
            pluginConfig.testMode && 'test mode',
          ]
            .filter(Boolean)
            .join(', ')}`,
        )
      }
      return
    }

    const { paystackResourceType } = syncConfig
    const id = doc.paystackID as string

    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [debug] Paystack ID to delete: ${id}`)
      logger.info(`[paystack-plugin] [debug] Resource type: ${paystackResourceType}`)
      logger.info(`[paystack-plugin] [delete] Removing '${collection.slug}' ID '${id}'`)
    }

    try {
      if (paystackResourceType === 'customer') {
        // Instead of delete, blacklist the customer
        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] [debug] Blacklisting customer instead of delete`)
        }
        const resp = await paystackProxy({
          path: '/customer/set_risk_action',
          method: 'POST',
          body: { customer: id, risk_action: 'deny' },
          secretKey: pluginConfig.paystackSecretKey,
          logs: pluginConfig.logs,
        })
        if (resp.status >= 200 && resp.status < 300) {
          if (pluginConfig.logs) {
            logger.info(`[paystack-plugin] Blacklisted customer '${id}' on Paystack`)
          }
        } else {
          logger.warn(`[paystack-plugin] Could not blacklist customer '${id}': ${resp.message}`)
        }
      } else {
        // For plan/product: attempt real DELETE, but swallow any 4xx/5xx
        const path = buildPath(paystackResourceType as any, id)
        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] [debug] Calling Paystack API: ${path}`)
        }
        const resp = await paystackProxy({
          path,
          method: 'DELETE',
          secretKey: pluginConfig.paystackSecretKey,
          logs: pluginConfig.logs,
        })
        if (resp.status >= 200 && resp.status < 300) {
          if (pluginConfig.logs) {
            logger.info(`[paystack-plugin] Deleted ${paystackResourceType} '${id}' on Paystack`)
          }
        } else {
          logger.warn(
            `[paystack-plugin] Delete ${paystackResourceType} '${id}' returned ${resp.status}: ${resp.message}`,
          )
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`[paystack-plugin] Exception in delete hook: ${msg}`)
    }
  }
