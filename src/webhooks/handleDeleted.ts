import type { PaystackWebhookHandler, SanitizedPaystackPluginConfig } from '../types.js'
import { PaystackPluginLogger } from '../utilities/logger.js'

type HandleDeleted = (
  args: {
    resourceType: string
    syncConfig: SanitizedPaystackPluginConfig['sync'][0]
    pluginConfig: SanitizedPaystackPluginConfig
  } & Omit<Parameters<PaystackWebhookHandler>[0], 'pluginConfig'>,
) => Promise<void>

/**
 * Deletes a document in Payload matching the Paystack ID for "deleted" events,
 * for any resource/collection configured for sync.
 */
export const handleDeleted: HandleDeleted = async (args) => {
  const { event, payload, pluginConfig, resourceType, syncConfig } = args
  const logger = new PaystackPluginLogger(payload.logger, pluginConfig, 'webhook')

  const collectionSlug = syncConfig.collection
  const paystackDoc: any = event.data

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
      paystackID = paystackDoc.id || paystackDoc.plan_code || paystackDoc.plan?.id
      break
    case 'product':
      paystackID = paystackDoc.id || paystackDoc.product_code || paystackDoc.product?.id
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

  try {
    // Look for an existing document with the matching paystackID or reference field
    let result
    if (paystackID) {
      result = await payload.find({
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
      result = await payload.find({
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

    const foundDoc = result?.docs?.[0]

    if (foundDoc) {
      await payload.delete({
        collection: collectionSlug,
        id: foundDoc.id,
      })
      logger.info(`Deleted '${collectionSlug}' doc from Paystack webhook.`)
    } else {
      logger.info(
        `No document to delete for Paystack ID '${paystackID}' or reference '${reference}' in '${collectionSlug}'.`,
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`Deletion sync error in '${collectionSlug}': ${msg}`)
  }
}
