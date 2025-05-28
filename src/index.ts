// ── src/index.ts ──
import type { Config, Endpoint, CollectionConfig, CollectionAfterChangeHook } from 'payload'
import type { PaystackPluginConfig, SanitizedPaystackPluginConfig } from './types.js'

import { getFields } from './fields/getFields.js'
import { createNewInPaystack } from './hooks/createNewInPaystack.js'
import { deleteFromPaystack } from './hooks/deleteFromPaystack.js'
import { syncExistingWithPaystack } from './hooks/syncExistingWithPaystack.js'

import { paystackREST } from './routes/rest.js'
import { paystackWebhooks } from './routes/webhooks.js'
import { updateProductsCurrency } from './utilities/updateProductsCurrency.js'
import { PaystackPluginLogger } from './utilities/logger.js'

export const paystackPlugin =
  (incomingConfig: PaystackPluginConfig) =>
  (config: Config): Config => {
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

    // 1) default slugs for read-only resources
    const defaultResourceSlugs = {
      transaction: 'transaction',
      refund: 'refund',
      order: 'order',
      subscription: 'subscription',
    }
    const resourceSlugs = {
      ...defaultResourceSlugs,
      ...(incomingConfig.resourceSlugs || {}),
    }

    // 2) sanitize incoming config
    const pluginConfig: SanitizedPaystackPluginConfig = {
      ...incomingConfig,
      rest: incomingConfig.rest ?? false,
      sync: incomingConfig.sync || [],
      testMode: incomingConfig.testMode ?? false,
      isTestKey,
      defaultCurrency: incomingConfig.defaultCurrency || 'NGN',
    }

    // Log configuration status
    console.log(`
🚀 Paystack Plugin Configuration:
   • Mode: ${isTestKey ? 'Test' : 'Live'}
   • REST API: ${pluginConfig.rest ? 'Enabled' : 'Disabled'}
   • Webhooks: ${pluginConfig.webhookSecret ? 'Configured' : 'Not configured'}
   • Synced Collections: ${pluginConfig.sync.map((s) => s.collection).join(', ') || 'None'}
   • Default Currency: ${pluginConfig.defaultCurrency}
`)

    // 3) Update existing products if currency changed and option is enabled
    if (
      !pluginConfig.testMode &&
      pluginConfig.updateExistingProductsOnCurrencyChange &&
      pluginConfig.defaultCurrency
    ) {
      const logger = {
        info: (msg: string) => console.log(msg),
        error: (msg: string) => console.error(msg),
      }
      updateProductsCurrency(pluginConfig, logger).catch((error) => {
        logger.error(`[paystack-plugin] Failed to update product currencies: ${error}`)
      })
    }

    //
    // 4) register webhook & REST endpoints
    //
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

    //
    // 5) inject sync-hooks & blacklist toggle into user's Collections
    //
    for (const collection of config.collections || []) {
      const syncCfg = pluginConfig.sync.find((s) => s.collection === collection.slug)
      if (!syncCfg) continue

      // a) inject paystackID / skipSync / dashboard link
      collection.fields = getFields({ collection, pluginConfig, syncConfig: syncCfg })

      // b) inject create/update/delete hooks
      collection.hooks = {
        ...(collection.hooks || {}),
        beforeValidate: [
          ...(collection.hooks?.beforeValidate || []),
          createNewInPaystack(pluginConfig),
        ],
        afterChange: [
          ...(collection.hooks?.afterChange || []),
          syncExistingWithPaystack(pluginConfig),
        ],
        afterDelete: [...(collection.hooks?.afterDelete || []), deleteFromPaystack(pluginConfig)],
      }

      // c) if this is your "customer" resource, add the blacklisting toggle + hook
      if (syncCfg.paystackResourceType === 'customer') {
        // only add the field if it doesn't already exist
        if (!collection.fields.some((f) => 'name' in f && f.name === 'blacklisted')) {
          collection.fields.push({
            name: 'blacklisted',
            type: 'checkbox',
            label: 'Blacklisted on Paystack',
            admin: {
              position: 'sidebar',
              description: 'If checked this customer will be blocked in Paystack',
              condition: (data: Record<string, any>) => !data?.skipSync, // Hide when skipSync is checked
            },
            hooks: {
              beforeValidate: [
                ({ value, data, operation }) => {
                  // If this is a create operation and skipSync is checked, prevent blacklisting
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

        // append to afterChange
        const afterCh = (collection.hooks.afterChange ||= [])
        afterCh.push(async ({ doc, previousDoc, operation, req }) => {
          // ◼️ **DO NOT** call on create (only on real updates)
          if (!previousDoc) return
          // no change, no call
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

    //
    // 6) auto-scaffold missing read-only collections (transactions, refunds, etc.)
    //
    config.collections = config.collections || []
    for (const [resource, slug] of Object.entries(resourceSlugs) as Array<
      [keyof typeof defaultResourceSlugs, string]
    >) {
      if (config.collections.some((c) => c.slug === slug)) continue

      const labels = {
        transaction: { singular: 'Transaction', plural: 'Transactions' },
        refund: { singular: 'Refund', plural: 'Refunds' },
        order: { singular: 'Order', plural: 'Orders' },
        subscription: { singular: 'Subscription', plural: 'Subscriptions' },
      }[resource]

      config.collections.push({
        slug,
        labels,
        access: { create: () => false, read: () => true, update: () => false, delete: () => false },
        fields: [
          { name: 'id', type: 'text', label: `${labels.singular} ID` },
          { name: 'status', type: 'text', label: 'Status' },
          // … expand per-resource as desired …
        ],
        hooks: {
          afterOperation: [
            async ({ operation, result, req }) => {
              const { paystackProxy } = await import('./utilities/paystackProxy.js')
              if (!result) return
              const isList = operation === 'find'
              const path = isList ? `/${resource}` : `/${resource}/${(result as any).doc?.id}`

              const resp = await paystackProxy({
                path,
                secretKey: pluginConfig.paystackSecretKey,
              })

              if (isList && resp.status === 200 && Array.isArray(resp.data)) {
                return {
                  docs: resp.data.map((item: any) => ({
                    id: item.id.toString(),
                    status: item.status,
                  })),
                  totalDocs: resp.data.length,
                }
              }

              if (!isList && resp.status === 200) {
                const item = resp.data
                return { doc: { id: item.id.toString(), status: item.status } }
              }
            },
          ],
        },
      } as CollectionConfig)
    }

    return config
  }
