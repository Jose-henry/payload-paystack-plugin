import type { CollectionBeforeValidateHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { deepen } from '../utilities/deepen.js'

export const createNewInPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionBeforeValidateHook =>
  async (args) => {
    const { data, operation, collection, req } = args
    const { payload } = req
    const syncConfig = pluginConfig.sync?.find((conf) => conf.collection === collection.slug)

    if (!syncConfig || data?.skipSync || process.env.NODE_ENV === 'test') return data

    if (pluginConfig.logs) {
      payload.logger.info(`[Create] '${collection.slug}' doc created, syncing to Paystack...`)
    }

    const payloadData = data || {}
    const body = deepen(syncConfig.fields.reduce((acc, f) => {
      acc[f.paystackProperty] = payloadData[f.fieldPath]
      return acc
    }, {} as Record<string, any>))

    try {
      const res = await fetch(`https://api.paystack.co/${syncConfig.paystackResourceType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pluginConfig.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json.message || 'Unknown Paystack error')

      if (!data) return {}
      
      data.paystackID = json.data.id
      data.skipSync = true

      return data
    } catch (err) {
      payload.logger.error(`[Paystack Sync] Error creating ${syncConfig.paystackResourceType}: ${err}`)
      return data
    }
  }
