/* tslint:disable */
/* eslint-disable */
/**
 * This file was automatically generated by Payload.
 * DO NOT MODIFY IT BY HAND. Instead, modify your source Payload config,
 * and re-run `payload generate:types` to regenerate this file.
 */

/**
 * Supported timezones in IANA format.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "supportedTimezones".
 */
export type SupportedTimezones =
  | 'Pacific/Midway'
  | 'Pacific/Niue'
  | 'Pacific/Honolulu'
  | 'Pacific/Rarotonga'
  | 'America/Anchorage'
  | 'Pacific/Gambier'
  | 'America/Los_Angeles'
  | 'America/Tijuana'
  | 'America/Denver'
  | 'America/Phoenix'
  | 'America/Chicago'
  | 'America/Guatemala'
  | 'America/New_York'
  | 'America/Bogota'
  | 'America/Caracas'
  | 'America/Santiago'
  | 'America/Buenos_Aires'
  | 'America/Sao_Paulo'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/Azores'
  | 'Atlantic/Cape_Verde'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Africa/Lagos'
  | 'Europe/Athens'
  | 'Africa/Cairo'
  | 'Europe/Moscow'
  | 'Asia/Riyadh'
  | 'Asia/Dubai'
  | 'Asia/Baku'
  | 'Asia/Karachi'
  | 'Asia/Tashkent'
  | 'Asia/Calcutta'
  | 'Asia/Dhaka'
  | 'Asia/Almaty'
  | 'Asia/Jakarta'
  | 'Asia/Bangkok'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'Asia/Seoul'
  | 'Australia/Brisbane'
  | 'Australia/Sydney'
  | 'Pacific/Guam'
  | 'Pacific/Noumea'
  | 'Pacific/Auckland'
  | 'Pacific/Fiji';

export interface Config {
  auth: {
    customer: CustomerAuthOperations;
  };
  blocks: {};
  collections: {
    plan: Plan;
    customer: Customer;
    media: Media;
    product: Product;
    transaction: Transaction;
    refund: Refund;
    order: Order;
    subscription: Subscription;
    'payload-locked-documents': PayloadLockedDocument;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  collectionsJoins: {};
  collectionsSelect: {
    plan: PlanSelect<false> | PlanSelect<true>;
    customer: CustomerSelect<false> | CustomerSelect<true>;
    media: MediaSelect<false> | MediaSelect<true>;
    product: ProductSelect<false> | ProductSelect<true>;
    transaction: TransactionSelect<false> | TransactionSelect<true>;
    refund: RefundSelect<false> | RefundSelect<true>;
    order: OrderSelect<false> | OrderSelect<true>;
    subscription: SubscriptionSelect<false> | SubscriptionSelect<true>;
    'payload-locked-documents': PayloadLockedDocumentsSelect<false> | PayloadLockedDocumentsSelect<true>;
    'payload-preferences': PayloadPreferencesSelect<false> | PayloadPreferencesSelect<true>;
    'payload-migrations': PayloadMigrationsSelect<false> | PayloadMigrationsSelect<true>;
  };
  db: {
    defaultIDType: string;
  };
  globals: {};
  globalsSelect: {};
  locale: null;
  user: Customer & {
    collection: 'customer';
  };
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface CustomerAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "plan".
 */
export interface Plan {
  id: string;
  paystackID?: string | null;
  /**
   * When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.
   */
  skipSync?: boolean | null;
  title?: string | null;
  /**
   * Amount must be equal to or greater than 100 for Paystack
   */
  amount?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "customer".
 */
export interface Customer {
  id: string;
  paystackID?: string | null;
  /**
   * When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.
   */
  skipSync?: boolean | null;
  name: string;
  lastName?: string | null;
  phone?: string | null;
  /**
   * If checked this customer will be blocked in Paystack
   */
  blacklisted?: boolean | null;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  password?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media".
 */
export interface Media {
  id: string;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "product".
 */
export interface Product {
  id: string;
  paystackID?: string | null;
  /**
   * When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.
   */
  skipSync?: boolean | null;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "transaction".
 */
export interface Transaction {
  id: string;
  paystackID?: string | null;
  /**
   * When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.
   */
  skipSync?: boolean | null;
  status?: string | null;
  reference?: string | null;
  amount?: number | null;
  currency?: string | null;
  paid_at?: string | null;
  customer_code?: string | null;
  channel?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "refund".
 */
export interface Refund {
  id: string;
  paystackID?: string | null;
  /**
   * When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.
   */
  skipSync?: boolean | null;
  transaction?: string | null;
  amount?: number | null;
  status?: string | null;
  currency?: string | null;
  refunded_at?: string | null;
  customer_note?: string | null;
  merchant_note?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "order".
 */
export interface Order {
  paystackID?: string | null;
  /**
   * When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.
   */
  skipSync?: boolean | null;
  id: string;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  customer_code?: string | null;
  created_at?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "subscription".
 */
export interface Subscription {
  id: string;
  paystackID?: string | null;
  /**
   * When checked (default), changes to this record will not be synced to Paystack. Uncheck to enable syncing.
   */
  skipSync?: boolean | null;
  plan?: string | null;
  customer_code?: string | null;
  status?: string | null;
  start?: string | null;
  amount?: number | null;
  subscription_code?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents".
 */
export interface PayloadLockedDocument {
  id: string;
  document?:
    | ({
        relationTo: 'plan';
        value: string | Plan;
      } | null)
    | ({
        relationTo: 'customer';
        value: string | Customer;
      } | null)
    | ({
        relationTo: 'media';
        value: string | Media;
      } | null)
    | ({
        relationTo: 'product';
        value: string | Product;
      } | null)
    | ({
        relationTo: 'transaction';
        value: string | Transaction;
      } | null)
    | ({
        relationTo: 'refund';
        value: string | Refund;
      } | null)
    | ({
        relationTo: 'order';
        value: string | Order;
      } | null)
    | ({
        relationTo: 'subscription';
        value: string | Subscription;
      } | null);
  globalSlug?: string | null;
  user: {
    relationTo: 'customer';
    value: string | Customer;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences".
 */
export interface PayloadPreference {
  id: string;
  user: {
    relationTo: 'customer';
    value: string | Customer;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations".
 */
export interface PayloadMigration {
  id: string;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "plan_select".
 */
export interface PlanSelect<T extends boolean = true> {
  paystackID?: T;
  skipSync?: T;
  title?: T;
  amount?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "customer_select".
 */
export interface CustomerSelect<T extends boolean = true> {
  paystackID?: T;
  skipSync?: T;
  name?: T;
  lastName?: T;
  phone?: T;
  blacklisted?: T;
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  loginAttempts?: T;
  lockUntil?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media_select".
 */
export interface MediaSelect<T extends boolean = true> {
  updatedAt?: T;
  createdAt?: T;
  url?: T;
  thumbnailURL?: T;
  filename?: T;
  mimeType?: T;
  filesize?: T;
  width?: T;
  height?: T;
  focalX?: T;
  focalY?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "product_select".
 */
export interface ProductSelect<T extends boolean = true> {
  paystackID?: T;
  skipSync?: T;
  name?: T;
  description?: T;
  price?: T;
  quantity?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "transaction_select".
 */
export interface TransactionSelect<T extends boolean = true> {
  paystackID?: T;
  skipSync?: T;
  status?: T;
  reference?: T;
  amount?: T;
  currency?: T;
  paid_at?: T;
  customer_code?: T;
  channel?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "refund_select".
 */
export interface RefundSelect<T extends boolean = true> {
  paystackID?: T;
  skipSync?: T;
  transaction?: T;
  amount?: T;
  status?: T;
  currency?: T;
  refunded_at?: T;
  customer_note?: T;
  merchant_note?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "order_select".
 */
export interface OrderSelect<T extends boolean = true> {
  paystackID?: T;
  skipSync?: T;
  id?: T;
  amount?: T;
  currency?: T;
  status?: T;
  customer_code?: T;
  created_at?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "subscription_select".
 */
export interface SubscriptionSelect<T extends boolean = true> {
  paystackID?: T;
  skipSync?: T;
  plan?: T;
  customer_code?: T;
  status?: T;
  start?: T;
  amount?: T;
  subscription_code?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents_select".
 */
export interface PayloadLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences_select".
 */
export interface PayloadPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations_select".
 */
export interface PayloadMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "auth".
 */
export interface Auth {
  [k: string]: unknown;
}


declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}