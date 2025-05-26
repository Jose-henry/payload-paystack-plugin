import type { PaystackWebhookHandler } from '../types.js'
import { handleCreatedOrUpdated } from './handleCreatedOrUpdated.js'
import { handleDeleted } from './handleDeleted.js'

export const handleWebhooks: PaystackWebhookHandler = async (args) => {
  const { event, payload, pluginConfig } = args

  if (pluginConfig?.logs) {
    payload.logger.info(`🪝 Received Paystack event: '${event.event}'`)
  }

  const eventType = event.event // e.g. "customer.created"
  const [resourceTypeRaw, method] = eventType.split('.') // "customer", "created"

  const syncConfig = pluginConfig?.sync?.find(
    (sync) => sync.paystackResourceTypeSingular === resourceTypeRaw,
  )

  if (!syncConfig) return

  switch (method) {
    case 'created':
    case 'updated':
      await handleCreatedOrUpdated({
        ...args,
        pluginConfig,
        resourceType: resourceTypeRaw,
        syncConfig,
      })
      break
    case 'deleted':
      await handleDeleted({
        ...args,
        pluginConfig,
        resourceType: resourceTypeRaw,
        syncConfig,
      })
      break
    default:
      break
  }
}
