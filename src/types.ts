import type { CollectionSlug, Payload, Config as PayloadConfig, PayloadRequest } from 'payload'

export type PaystackWebhookHandler<T = any> = (args: {
  config: PayloadConfig
  event: T
  payload: Payload
  pluginConfig?: PaystackPluginConfig
  req: PayloadRequest
}) => Promise<void> | void

export type PaystackWebhookHandlers = {
  [webhookName: string]: PaystackWebhookHandler
}

export type FieldSyncConfig = {
  fieldPath: string
  paystackProperty: string
}

export type SyncConfig = {
  collection: CollectionSlug
  fields: FieldSyncConfig[]
  paystackResourceType: 'plans' | 'customers' // You can expand this as needed
  paystackResourceTypeSingular: 'plan' | 'customer'
}

export type PaystackPluginConfig = {
  enabled?: boolean
  isTestKey?: boolean
  logs?: boolean
  /** @default false */
  rest?: boolean
  paystackSecretKey: string
  webhookSecret?: string
  sync?: SyncConfig[]
  webhooks?: PaystackWebhookHandler | PaystackWebhookHandlers
}

export type SanitizedPaystackPluginConfig = {
  sync: SyncConfig[]
} & PaystackPluginConfig

export type PaystackProxy = (args: {
  paystackArgs: any[]
  paystackMethod: string
  paystackSecretKey: string
}) => Promise<{
  data?: any
  message?: string
  status: number
}>
