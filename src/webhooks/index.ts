import type { PaystackWebhookHandler } from '../types.js'
import { handleCreatedOrUpdated } from './handleCreatedOrUpdated.js'
import { handleDeleted } from './handleDeleted.js'

/**
 * Orchestrates native sync for Paystack webhook events.
 * Handles all collections registered in pluginConfig.sync (including read-only).
 * - "create"/"created"/"update"/"updated"/"success"/"processed" => upsert in Payload
 * - "delete"/"deleted" => remove from Payload
 * Logs if method/action is not handled natively.
 */
export const handleWebhooks: PaystackWebhookHandler = async (args) => {
  const { event, payload, pluginConfig } = args

  if (pluginConfig?.logs) {
    payload.logger.info(`🪝 Received Paystack event: '${event.event}'`)
  }

  // Get resource and action from the event name (e.g. "transaction.success")
  const [resourceTypeRaw, method] = event.event.split('.') // e.g., "transaction", "success"

  // Find sync config for this resource type (e.g., transaction, refund, etc.)
  const syncConfig = pluginConfig?.sync?.find(
    (sync) => sync.paystackResourceTypeSingular === resourceTypeRaw,
  )

  // If this event isn't mapped to a sync config, do nothing (user custom handler will still run in route)
  if (!syncConfig) return

  // Native sync logic for upsert/delete
  switch (method) {
    // Upsert on any create/update/success/processed event
    case 'create':
    case 'created':
    case 'update':
    case 'updated':
    case 'success':
    case 'processed':
      await handleCreatedOrUpdated({
        ...args,
        pluginConfig,
        resourceType: resourceTypeRaw,
        syncConfig,
      })
      break
    // Remove on "deleted"
    case 'delete':
    case 'deleted':
      await handleDeleted({
        ...args,
        pluginConfig,
        resourceType: resourceTypeRaw,
        syncConfig,
      })
      break
    default:
      // Log for unsupported native sync events (but user's handler may still run)
      if (pluginConfig?.logs) {
        payload.logger.info(
          `ℹ️ Paystack event '${event.event}' received, but not natively handled by plugin. Only user-defined handlers (if any) will run.`,
        )
      }
      break
  }
}
