import type { PaystackWebhookHandler, SanitizedPaystackPluginConfig } from '../types.js'

type HandleDeleted = (
  args: {
    resourceType: string
    syncConfig: SanitizedPaystackPluginConfig['sync'][0]
  } & Parameters<PaystackWebhookHandler>[0],
) => Promise<void>

/**
 * Deletes a document in Payload matching the Paystack ID for "deleted" events,
 * for any resource/collection configured for sync.
 */
export const handleDeleted: HandleDeleted = async (args) => {
  const { event, payload, pluginConfig, syncConfig } = args
  const { logs } = pluginConfig || {}

  const collectionSlug = syncConfig.collection
  const paystackID = event.data.id

  try {
    // Look for an existing document with the matching paystackID field
    const result = await payload.find({
      collection: collectionSlug,
      limit: 1,
      pagination: false,
      where: {
        paystackID: {
          equals: paystackID,
        },
      },
    })

    const foundDoc = result.docs[0]

    if (foundDoc) {
      await payload.delete({
        collection: collectionSlug,
        id: foundDoc.id,
      })
      if (logs) payload.logger.info(`🗑️ Deleted '${collectionSlug}' doc from Paystack webhook.`)
    } else if (logs) {
      payload.logger.info(
        `ℹ️ No document to delete for Paystack ID '${paystackID}' in '${collectionSlug}'.`,
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    payload.logger.error(`❌ Deletion sync error in '${collectionSlug}': ${msg}`)
  }
}
