import type { Payload } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { PaystackPluginLogger } from '../utilities/logger.js'

type SyncBlacklistArgs = {
  payload: Payload
  pluginConfig: PaystackPluginConfig
  logger: PaystackPluginLogger
  pageSize?: number
  maxPages?: number
}

/**
 * Polls Paystack customers and updates the 'blacklisted' field in the Payload 'customer' collection.
 * Only runs if pluginConfig.blacklistCustomerOption is true.
 */
export async function syncBlacklistCustomers({ payload, pluginConfig, logger }: SyncBlacklistArgs) {
  // Defensive: skip polling if not enabled in config
  logger.info('Polling function started.')

  if (!pluginConfig.blacklistCustomerOption) {
    logger.info('Skipped blacklist sync: blacklistCustomerOption is not enabled.')
    return
  }

  // If in test mode, just log and return
  if (pluginConfig.testMode) {
    logger.info('Test mode enabled - skipping actual Paystack API call')
    return
  }

  const pageSize = pluginConfig.pollingPageSize || 100 // Allow page size config, default 100
  const pollingMaxPages = pluginConfig.pollingMaxPages || 20 // Optionally cap pages, default 20 (2,000 records)
  let page = 1
  let totalSynced = 0
  let hasMore = true

  const { paystackSecretKey } = pluginConfig

  while (hasMore && page <= pollingMaxPages) {
    try {
      const { paystackProxy } = await import('../utilities/paystackProxy.js')
      const resp = await paystackProxy({
        path: `/customer?page=${page}&perPage=${pageSize}`,
        secretKey: paystackSecretKey,
        logs: pluginConfig.logs,
      })

      if (resp.status !== 200 || !Array.isArray(resp.data)) break

      for (const customer of resp.data) {
        // Find corresponding user in Payload by paystackID/customer_code
        const existing = await payload.find({
          collection: 'customer',
          where: { paystackID: { equals: customer.customer_code } },
          pagination: false,
        })
        if (existing.docs.length > 0) {
          const doc = existing.docs[0]
          // Update blacklist status if changed
          if (doc.blacklisted !== (customer.risk_action === 'deny')) {
            await payload.update({
              collection: 'customer',
              id: doc.id,
              data: { blacklisted: customer.risk_action === 'deny' },
            })
            totalSynced++
          }
        }
      }

      hasMore = resp.data.length === pageSize
      page++
    } catch (e) {
      logger.error(`Error syncing blacklist status: ${e}`)
      break
    }
  }
  logger.info(`Synced blacklist status for ${totalSynced} customers`)
}
