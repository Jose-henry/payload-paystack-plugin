import type { Config, Endpoint } from 'payload'
import type { PaystackPluginConfig, SanitizedPaystackPluginConfig } from './types.js'

import { getFields } from './fields/getFields.js'
import { createNewInPaystack } from './hooks/createNewInPaystack.js'
import { deleteFromPaystack } from './hooks/deleteFromPaystack.js'
import { syncExistingWithPaystack } from './hooks/syncExistingWithPaystack.js'
import { paystackREST } from './routes/rest.js'
import { paystackWebhooks } from './routes/webhooks.js'
import { syncBlacklistCustomers } from './polling/syncBlacklistCustomers.js'
import { PaystackPluginLogger } from './utilities/logger.js'

declare global {
  var __PAYSTACK_CONFIG_LOGGED__: boolean | undefined
}

export const paystackPlugin =
  (incomingConfig: PaystackPluginConfig) =>
  (config: Config): Config => {
    // Check if plugin is enabled
    if (incomingConfig.enabled === false) {
      return config
    }

    // Validate required configuration
    if (!incomingConfig.paystackSecretKey) {
      throw new Error(
        'Paystack Secret Key is required. Please add PAYSTACK_SECRET_KEY to your environment variables or provide it in the plugin configuration.',
      )
    }

    // Check if we're using test or live key
    const isTestKey = incomingConfig.paystackSecretKey.startsWith('sk_test_')
    const isLiveKey = incomingConfig.paystackSecretKey.startsWith('sk_live_')

    if (!isTestKey && !isLiveKey) {
      throw new Error(
        'Invalid Paystack Secret Key format. Key must start with either "sk_test_" for test mode or "sk_live_" for live mode.',
      )
    }

    // Log warning if using live key in non-production environment
    const isDevelopment = process.env.NODE_ENV !== 'production'
    if (isLiveKey && isDevelopment) {
      console.warn(`
   ⚠️ WARNING: You are using a Paystack LIVE key in a non-production environment.
   This is not recommended as it will affect real transactions.
   Current environment: ${process.env.NODE_ENV || 'development (NODE_ENV not set)'}
   To suppress this warning, set NODE_ENV=production in your environment variables.
`)
    }

    // 1) Sanitize incoming config
    const pluginConfig: SanitizedPaystackPluginConfig = {
      ...incomingConfig,
      rest: incomingConfig.rest ?? false,
      sync: incomingConfig.sync || [],
      testMode: incomingConfig.testMode ?? false,
      isTestKey,
      defaultCurrency: incomingConfig.defaultCurrency || 'NGN',
    }

    // Validate polling configuration
    if (pluginConfig.polling && !pluginConfig.blacklistCustomerOption) {
      throw new Error('polling requires blacklistCustomerOption to be enabled')
    }

    if (
      (pluginConfig.pollingPageSize ||
        pluginConfig.pollingMaxPages ||
        pluginConfig.pollingInterval) &&
      (!pluginConfig.blacklistCustomerOption || !pluginConfig.polling)
    ) {
      throw new Error(
        'All other polling parameters require both blacklistCustomerOption and polling to be enabled',
      )
    }

    if (pluginConfig.polling && !pluginConfig.blacklistCustomerOption) {
      throw new Error('polling requires blacklistCustomerOption to be enabled')
    }

    // ---- Log Paystack Plugin config (ONLY ONCE) ----
    if (!global.__PAYSTACK_CONFIG_LOGGED__) {
      global.__PAYSTACK_CONFIG_LOGGED__ = true
      console.log(`
🚀 Paystack Plugin Configuration:
   • Mode: ${isTestKey ? 'Test' : 'Live'}
   • REST API: ${pluginConfig.rest ? 'Enabled' : 'Disabled'}
   • Webhooks: ${pluginConfig.webhooks ? (pluginConfig.webhookSecret ? 'Configured with webhook secret' : 'Configured but no webhook secret') : 'Not configured'}
   • Blacklist Customer Option: ${pluginConfig.blacklistCustomerOption ? (pluginConfig.polling ? 'Enabled with polling' : 'Enabled without polling') : 'Disabled'}
   • Synced Collections: ${pluginConfig.sync.map((s) => s.collection).join(', ') || 'None'}
   • Default Currency: ${pluginConfig.defaultCurrency}
`)
    }

    // 2) Register webhook & REST endpoints
    const endpoints: Endpoint[] = [
      ...(config.endpoints || []),
      {
        method: 'post',
        path: '/paystack/webhook',
        handler: async (req) => paystackWebhooks({ req, config, pluginConfig }),
      },
    ]
    if (pluginConfig.rest) {
      endpoints.push({
        method: 'post',
        path: '/paystack/rest',
        handler: async (req) => paystackREST({ req, pluginConfig }),
      })
    }
    config.endpoints = endpoints

    // 3) Inject sync hooks & fields into only those user collections listed in sync config
    for (const collection of config.collections || []) {
      const syncCfg = pluginConfig.sync.find((s) => s.collection === collection.slug)
      if (!syncCfg) continue

      // a) Inject paystackID, skipSync, and other dashboard fields
      collection.fields = getFields({ collection, pluginConfig, syncConfig: syncCfg })

      // b) Inject create/update/delete hooks
      collection.hooks = {
        ...(collection.hooks || {}),
        beforeValidate: [
          ...(collection.hooks?.beforeValidate || []),
          createNewInPaystack(pluginConfig),
        ],
        beforeChange: [
          ...(collection.hooks?.beforeChange || []),
          syncExistingWithPaystack(pluginConfig),
        ],
        afterDelete: [...(collection.hooks?.afterDelete || []), deleteFromPaystack(pluginConfig)],
      }

      // c) Customer blacklisting toggle (if applicable)
      if (syncCfg.paystackResourceType === 'customer' && pluginConfig.blacklistCustomerOption) {
        // Only add the field if it doesn't already exist
        if (!collection.fields.some((f) => 'name' in f && f.name === 'blacklisted')) {
          collection.fields.push({
            name: 'blacklisted',
            type: 'checkbox',
            label: 'Blacklisted on Paystack',
            defaultValue: false,
            admin: {
              position: 'sidebar',
              description: 'If checked this customer will be blocked in Paystack',
              condition: (data: Record<string, any>) => !data?.skipSync,
            },
            hooks: {
              beforeValidate: [
                ({ value, data, operation }) => {
                  if (operation === 'create' && data?.skipSync && value) {
                    throw new Error(
                      'Cannot blacklist a customer during creation when Skip Sync is checked. Please uncheck Skip Sync first.',
                    )
                  }
                  return value
                },
              ],
            },
          })
        }

        // Append to afterChange
        const afterCh = (collection.hooks.afterChange ||= [])
        afterCh.push(async ({ doc, previousDoc, operation, req }) => {
          // Only on real updates
          if (!previousDoc) return
          if (doc.blacklisted === previousDoc.blacklisted) return

          const { paystackProxy } = await import('./utilities/paystackProxy.js')
          const action = doc.blacklisted ? 'deny' : 'default'
          const resp = await paystackProxy({
            path: '/customer/set_risk_action',
            method: 'POST',
            body: { customer: doc.paystackID, risk_action: action },
            secretKey: pluginConfig.paystackSecretKey,
          })

          if (resp.status >= 200 && resp.status < 300) {
            req.payload.logger.info(
              `[paystack-plugin] ${action === 'deny' ? 'Blacklisted' : 'Whitelisted'} customer ${doc.paystackID}`,
            )
          } else {
            req.payload.logger.error(
              `[paystack-plugin] Failed set_risk_action=${action} for customer ${doc.paystackID}: ${resp.message}`,
            )
          }
        })
      }
    }

    // 4) Extend onInit so user custom logic runs, but polling "just works"
    const userOnInit = config.onInit
    config.onInit = async (payload) => {
      // Run user's original onInit (if any)
      if (typeof userOnInit === 'function') {
        await userOnInit(payload)
      }
      // Run plugin's blacklist polling if enabled
      if (pluginConfig.blacklistCustomerOption && pluginConfig.polling) {
        // Run immediately if enabled
        if (pluginConfig.pollingRunImmediately) {
          payload.logger.info(
            '[paystack-plugin] Running (immediately) Paystack blacklist polling...',
          )
          await syncBlacklistCustomers({
            payload,
            pluginConfig,
            logger: new PaystackPluginLogger(payload.logger, pluginConfig, 'polling'),
            pageSize: pluginConfig.pollingPageSize,
            maxPages: pluginConfig.pollingMaxPages,
          })
        }

        setInterval(
          () => {
            payload.logger.info(
              `[paystack-plugin] Running Paystack blacklist polling on interval ${pluginConfig.pollingInterval}ms...`,
            )
            syncBlacklistCustomers({
              payload,
              pluginConfig,
              logger: new PaystackPluginLogger(payload.logger, pluginConfig, 'polling'),
              pageSize: pluginConfig.pollingPageSize,
              maxPages: pluginConfig.pollingMaxPages,
            })
          },
          pluginConfig.pollingInterval || 10 * 60 * 1000,
        )
      }
    }

    // Export polling function for manual use if needed
    return config
  }

export { syncBlacklistCustomers }
