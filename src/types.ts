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
  /** Resource path in Paystack API, e.g. 'plan', 'customer', 'product' */
  paystackResourceType: string
  /** Singular form for webhook logic, e.g. 'plan', 'customer' */
  paystackResourceTypeSingular: string
}

export type PaystackPluginConfig = {
  /** Enable the plugin; default true */
  enabled?: boolean
  /** Enable detailed logging of sync events */
  logs?: boolean
  /** Expose a /paystack/rest proxy endpoint */
  rest?: boolean
  /** Your Paystack secret key, e.g. sk_test_xxx */
  paystackSecretKey: string
  /** Secret to verify webhooks; same as the secret key */
  webhookSecret?: string
  /** Sync configuration per collection */
  sync?: SyncConfig[]
  /** Custom webhook handlers */
  webhooks?: PaystackWebhookHandler | PaystackWebhookHandlers
  /**
   * When true, prevents all API calls to Paystack (both test and live environments).
   * When false (default), makes real API calls using the provided secret key.
   * This is different from isTestKey which determines which Paystack environment to use.
   */
  testMode?: boolean
  /**
   * Default currency for products (ISO 4217 format)
   * Supported currencies: NGN, USD, GHS, ZAR, KES
   * @default 'NGN'
   */
  defaultCurrency?: 'NGN' | 'USD' | 'GHS' | 'ZAR' | 'KES'
  blacklistCustomerOption?: boolean

  pollingPageSize?: number
  pollingMaxPages?: number
  /**
   * Interval in milliseconds for polling Paystack to sync blacklisted customers.
   * Examples:
   * - 60 * 60 * 1000 = 3,600,000ms (1 hour)
   * - 5 * 60 * 1000 = 300,000ms (5 minutes)
   * - 24 * 60 * 60 * 1000 = 86,400,000ms (24 hours)
   */
  pollingInterval?: number
}

export type SanitizedPaystackPluginConfig = {
  sync: SyncConfig[]
  isTestKey?: boolean
  testMode: boolean
} & Omit<PaystackPluginConfig, 'testMode'>

export type PaystackProxy = (args: {
  path: string
  method?: string
  body?: any
  secretKey: string
}) => Promise<{
  data?: any
  message?: string
  status: number
}>

/**
 * Example: Paystack webhook event shape (generic).
 */
export type PaystackWebhookEvent = {
  event: string // e.g. "transaction.success"
  data: any // event payload from Paystack (typed further per event type)
}
