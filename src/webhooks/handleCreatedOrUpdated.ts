import { v4 as uuid } from 'uuid'
import { deepen } from '../utilities/deepen.js'
import type { PaystackWebhookHandler, SanitizedPaystackPluginConfig } from '../types.js'

type HandleCreatedOrUpdated = (
  args: {
    resourceType: string
    syncConfig: SanitizedPaystackPluginConfig['sync'][0]
  } & Parameters<PaystackWebhookHandler>[0],
) => Promise<void>

/**
 * Upserts a document in Payload for any "created", "updated", "success", or "processed" event
 * coming from Paystack, for any resource/collection configured for sync.
 */
export const handleCreatedOrUpdated: HandleCreatedOrUpdated = async (args) => {
  const { config, event, payload, pluginConfig, resourceType, syncConfig } = args
  const { logs } = pluginConfig || {}

  const paystackDoc: any = event.data
  const paystackID = paystackDoc.id
  const collectionSlug = syncConfig.collection

  // Try to find existing document by paystackID
  const existingQuery = await payload.find({
    collection: collectionSlug,
    limit: 1,
    pagination: false,
    where: {
      paystackID: {
        equals: paystackID,
      },
    },
  })

  const foundDoc = existingQuery.docs[0] as any

  // Map Paystack properties to your local fields using the sync config
  let syncedData = syncConfig.fields.reduce(
    (acc, field) => {
      acc[field.fieldPath] = paystackDoc[field.paystackProperty]
      return acc
    },
    {} as Record<string, any>,
  )

  syncedData = deepen({
    ...syncedData,
    paystackID,
  })

  const isAuthCollection = config?.collections?.find((c) => c.slug === collectionSlug)?.auth

  try {
    if (!foundDoc) {
      const password = uuid()
      await payload.create({
        collection: collectionSlug,
        data: {
          ...syncedData,
          ...(isAuthCollection && {
            password,
            passwordConfirm: password,
          }),
        },
        disableVerificationEmail: !!isAuthCollection,
      })
      if (logs) payload.logger.info(`✅ Created new '${collectionSlug}' doc from Paystack webhook.`)
    } else {
      await payload.update({
        id: foundDoc.id,
        collection: collectionSlug,
        data: syncedData,
      })
      if (logs) payload.logger.info(`✅ Updated '${collectionSlug}' doc from Paystack webhook.`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    payload.logger.error(`❌ Sync error for '${collectionSlug}': ${msg}`)
  }
}
