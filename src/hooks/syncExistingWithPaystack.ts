import type { CollectionBeforeChangeHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { deepen } from '../utilities/deepen.js'

export const syncExistingWithPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionBeforeChangeHook =>
  async (args) => {
    const { data, operation, originalDoc, collection, req } = args
    const { payload } = req
    const syncConfig = pluginConfig.sync?.find((conf) => conf.collection === collection.slug)

    if (!syncConfig || data.skipSync || process.env.NODE_ENV === 'test') return data

    if (pluginConfig.logs) {
      payload.logger.info(`[Update] '${collection.slug}' doc updated, syncing to Paystack...`)
    }

    const body = deepen(syncConfig.fields.reduce((acc, f) => {
      acc[f.paystackProperty] = data[f.fieldPath]
      return acc
    }, {} as Record<string, any>))

    try {
      const res = await fetch(
        `https://api.paystack.co/${syncConfig.paystackResourceType}/${data.paystackID}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${pluginConfig.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Unknown Paystack error')
    } catch (err) {
      payload.logger.error(`[Paystack Sync] Error updating ${syncConfig.paystackResourceType}: ${err}`)
    }

    data.skipSync = false
    return data
  }
