import type { CollectionConfig, Field } from 'payload'
import type { SanitizedPaystackPluginConfig, SyncConfig } from '../types.js'

interface GetFieldsArgs {
  collection: CollectionConfig
  pluginConfig: SanitizedPaystackPluginConfig
  syncConfig: SyncConfig
}

/**
 * Generates the fields injected into a synchronized collection:
 * 1) paystackID: read-only text field storing remote ID
 * 2) skipSync: read-only checkbox to avoid infinite loops
 * 3) docUrl: UI component linking directly to Paystack dashboard
 */
export const getFields = ({ collection, pluginConfig, syncConfig }: GetFieldsArgs): Field[] => {
  // Field storing the Paystack ID
  const paystackIDField: Field = {
    name: 'paystackID',
    type: 'text',
    label: 'Paystack ID',
    saveToJWT: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
  }

  // Flag to skip plugin hooks (used by webhooks)
  const skipSyncField: Field = {
    name: 'skipSync',
    type: 'checkbox',
    label: 'Skip Sync',
    defaultValue: false,
    admin: {
      position: 'sidebar',
      description:
        'When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.',
    },
  }

  // UI component linking to the Paystack dashboard
  const docUrlField: Field = {
    name: 'docUrl',
    type: 'ui',
    label: 'View in Paystack',
    admin: {
      position: 'sidebar',
      custom: {
        isTestKey: pluginConfig.isTestKey,
        nameOfIDField: 'paystackID',
        paystackResourceType: syncConfig.paystackResourceType,
      },
      components: {
        Field: 'paystack-payload-plugin/client#LinkToDoc',
      },
    },
  }

  // Prepend integration fields so they appear at the top of the sidebar
  return [paystackIDField, skipSyncField, docUrlField, ...collection.fields]
}
