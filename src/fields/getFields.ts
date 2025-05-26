import type { CollectionConfig, Field } from 'payload'
import type { SanitizedPaystackPluginConfig } from '../types.js'

interface Args {
  collection: CollectionConfig
  pluginConfig: SanitizedPaystackPluginConfig
  syncConfig: {
    paystackResourceType: string
  }
}

export const getFields = ({ collection, pluginConfig, syncConfig }: Args): Field[] => {
  const paystackIDField: Field = {
    name: 'paystackID',
    type: 'text',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    label: 'Paystack ID',
    saveToJWT: true,
  }

  const skipSyncField: Field = {
    name: 'skipSync',
    type: 'checkbox',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    label: 'Skip Sync',
  }

  const docUrlField: Field = {
    name: 'docUrl',
    type: 'ui',
    admin: {
      components: {
        Field: '@yourplugin/paystack-plugin/client#LinkToDoc',
      },
      custom: {
        isTestKey: pluginConfig.isTestKey,
        nameOfIDField: 'paystackID',
        paystackResourceType: syncConfig.paystackResourceType,
      },
      position: 'sidebar',
    },
  }

  return [...collection.fields, paystackIDField, skipSyncField, docUrlField]
}
