import { v4 as uuid } from 'uuid'
import { deepen } from '../utilities/deepen.js'
import type { PaystackWebhookHandler, SanitizedPaystackPluginConfig } from '../types.js'
import { PaystackPluginLogger } from '../utilities/logger.js'

type HandleCreatedOrUpdated = (
  args: {
    resourceType: string
    syncConfig: SanitizedPaystackPluginConfig['sync'][0]
    pluginConfig: SanitizedPaystackPluginConfig
  } & Omit<Parameters<PaystackWebhookHandler>[0], 'pluginConfig'>,
) => Promise<void>

/**
 * Upserts a document in Payload for any "created", "updated", "success", or "processed" event
 * coming from Paystack, for any resource/collection configured for sync.
 */
export const handleCreatedOrUpdated: HandleCreatedOrUpdated = async (args) => {
  const { config, event, payload, resourceType, syncConfig, pluginConfig } = args
  const logger = new PaystackPluginLogger(payload.logger, pluginConfig, 'webhook')

  const paystackDoc: any = event.data
  const collectionSlug = syncConfig.collection

  // Smart ID extraction based on resource type
  let paystackID: string | number | undefined
  let reference: string | number | undefined

  // Handle different resource types and their ID locations
  switch (resourceType) {
    case 'customer':
      paystackID = paystackDoc.customer?.id || paystackDoc.customer?.customer_code || paystackDoc.id
      break
    case 'transaction':
    case 'charge':
      paystackID = paystackDoc.id
      reference = paystackDoc.reference
      break
    case 'plan':
      paystackID = paystackDoc.id || paystackDoc.plan_code
      break
    case 'product':
      paystackID = paystackDoc.id || paystackDoc.product_code
      break
    case 'refund':
      paystackID = paystackDoc.id || paystackDoc.reference
      reference = paystackDoc.reference
      break
    case 'subscription':
      paystackID = paystackDoc.id || paystackDoc.subscription_code
      break
    case 'transfer':
      paystackID = paystackDoc.id || paystackDoc.reference
      reference = paystackDoc.reference
      break
    case 'dedicatedaccount':
      paystackID = paystackDoc.id || paystackDoc.account_number
      break
    case 'paymentrequest':
      paystackID = paystackDoc.id || paystackDoc.request_code
      break
    case 'invoice':
      paystackID = paystackDoc.id || paystackDoc.invoice_code
      break
    default:
      paystackID =
        paystackDoc.id || paystackDoc[`${resourceType}_code`] || paystackDoc[`${resourceType}_id`]
      reference = paystackDoc.reference
  }

  if (!paystackID && !reference) {
    logger.info(
      `Event processed, but no identifier (paystackID/reference) found for ${resourceType}. Available fields: ${Object.keys(paystackDoc).join(', ')}. Refer to Paystack documentation for which events/resources require which identifiers.`,
    )
    return
  }

  // Try to find existing document by paystackID or reference
  let existingQuery
  if (paystackID) {
    existingQuery = await payload.find({
      collection: collectionSlug,
      limit: 1,
      pagination: false,
      where: {
        paystackID: {
          equals: paystackID,
        },
      },
    })
  } else if (reference) {
    existingQuery = await payload.find({
      collection: collectionSlug,
      limit: 1,
      pagination: false,
      where: {
        reference: {
          equals: reference,
        },
      },
    })
  }

  const foundDoc = existingQuery?.docs?.[0] as any

  // Map Paystack properties to your local fields using the sync config
  let syncedData = syncConfig.fields.reduce(
    (acc, field) => {
      // Handle nested properties (e.g., customer.email)
      const value = field.paystackProperty.split('.').reduce((obj, key) => obj?.[key], paystackDoc)
      acc[field.fieldPath] = value
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
      logger.info(`Created new '${collectionSlug}' doc from Paystack webhook.`)
    } else {
      await payload.update({
        id: foundDoc.id,
        collection: collectionSlug,
        data: syncedData,
      })
      logger.info(`Updated '${collectionSlug}' doc from Paystack webhook.`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`Sync error for '${collectionSlug}': ${msg}`)
  }
}
