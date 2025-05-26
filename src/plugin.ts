/* import type { Config, Endpoint } from 'payload'
import type { PaystackPluginConfig, SanitizedPaystackPluginConfig } from './types.js'

import { getFields } from './fields/getFields.js'
import { createNewInPaystack } from './hooks/createNewInPaystack.js'
import { deleteFromPaystack } from './hooks/deleteFromPaystack.js'
import { syncExistingWithPaystack } from './hooks/syncExistingWithPaystack.js'

import { paystackREST } from './routes/rest.js'
import { paystackWebhooks } from './routes/webhooks.js'

export const paystackPlugin =
  (incomingConfig: PaystackPluginConfig) =>
  (config: Config): Config => {
    const pluginConfig: SanitizedPaystackPluginConfig = {
      ...incomingConfig,
      rest: incomingConfig.rest ?? false,
      sync: incomingConfig.sync || [],
    }

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

    for (const collection of config.collections || []) {
      const syncConfig = pluginConfig.sync?.find((conf) => conf.collection === collection.slug)

      if (syncConfig) {
        collection.fields = getFields({ collection, pluginConfig, syncConfig })

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
          afterDelete: [
            ...(collection.hooks?.afterDelete || []),
            deleteFromPaystack(pluginConfig),
          ],
        }
      }
    }

    return config
  }
 */