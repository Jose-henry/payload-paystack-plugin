import type { CollectionAfterDeleteHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'

export const deleteFromPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionAfterDeleteHook =>
  async (args) => {
    const { doc, collection, req } = args
    const { payload } = req
    const syncConfig = pluginConfig.sync?.find((conf) => conf.collection === collection.slug)

    if (!syncConfig || process.env.NODE_ENV === 'test') return

    if (pluginConfig.logs) {
      payload.logger.info(`[Delete] Deleting Paystack record with ID: '${doc.paystackID}'`)
    }

    try {
      await fetch(
        `https://api.paystack.co/${syncConfig.paystackResourceType}/${doc.paystackID}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${pluginConfig.paystackSecretKey}`,
          },
        }
      )
    } catch (err) {
      payload.logger.error(`[Paystack Sync] Error deleting ${syncConfig.paystackResourceType}: ${err}`)
    }
  }
