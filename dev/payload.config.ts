import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { paystackPlugin } from '../src/index.js'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { devUser } from './helpers/credentials.js'
import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { seed } from './seed.js'
import type { PaystackPluginConfig } from '../src/types.js'
import { chargeSuccess } from 'webhooks/chargeSuccess.js'
import { fa } from 'payload/i18n/fa'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

export default buildConfig({
  admin: {
    autoLogin: devUser,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [
    {
      slug: 'plan',
      fields: [
        { name: 'title', type: 'text' },
        {
          name: 'amount',
          type: 'number',
          min: 100,
          admin: {
            description: 'Amount must be equal to or greater than 100 for Paystack',
          },
        },
      ],
    },
    {
      slug: 'customer',
      auth: true,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'lastName', type: 'text' },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' },
      ],
    },
    {
      slug: 'media',
      fields: [],
      upload: { staticDir: path.resolve(dirname, 'media') },
    },
    {
      slug: 'product',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
        },
        { name: 'quantity', type: 'number', required: true, min: 0, defaultValue: 1 },
      ],
    },

    // ---- Read-Only: Transaction ----
    {
      slug: 'transaction',
      labels: { singular: 'Transaction', plural: 'Transactions' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'status', type: 'text', label: 'Status' },
        { name: 'reference', type: 'text', label: 'Reference' },
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'currency', type: 'text', label: 'Currency' },
        { name: 'paid_at', type: 'text', label: 'Paid At' },
        { name: 'customer_code', type: 'text', label: 'Customer Code' },
        { name: 'channel', type: 'text', label: 'Channel' },
      ],
    },

    // ---- Read-Only: Refund ----
    {
      slug: 'refund',
      labels: { singular: 'Refund', plural: 'Refunds' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'transaction', type: 'text', label: 'Transaction ID' },
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'status', type: 'text', label: 'Status' },
        { name: 'currency', type: 'text', label: 'Currency' },
        { name: 'refunded_at', type: 'text', label: 'Refunded At' },
        { name: 'customer_note', type: 'text', label: 'Customer Note' },
        { name: 'merchant_note', type: 'text', label: 'Merchant Note' },
      ],
    },

    // ---- Read-Only: Order ----
    {
      slug: 'order',
      labels: { singular: 'Order', plural: 'Orders' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'id', type: 'text', label: 'Order ID' },
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'currency', type: 'text', label: 'Currency' },
        { name: 'status', type: 'text', label: 'Status' },
        { name: 'customer_code', type: 'text', label: 'Customer Code' },
        { name: 'created_at', type: 'text', label: 'Created At' },
      ],
    },

    // ---- Read-Only: Subscription ----
    {
      slug: 'subscription',
      labels: { singular: 'Subscription', plural: 'Subscriptions' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'plan', type: 'text', label: 'Plan Code' },
        { name: 'customer_code', type: 'text', label: 'Customer Code' },
        { name: 'status', type: 'text', label: 'Status' },
        { name: 'start', type: 'text', label: 'Start Date' },
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'subscription_code', type: 'text', label: 'Subscription Code' },
      ],
    },
  ],
  db: mongooseAdapter({ url: process.env.DATABASE_URI || '' }),
  editor: lexicalEditor(),
  email: testEmailAdapter,
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    paystackPlugin({
      enabled: true,
      paystackSecretKey: process.env.PAYSTACK_SECRET_KEY!,
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
      rest: true,
      logs: true,
      blacklistCustomerOption: true,
      defaultCurrency: 'NGN',
      webhooks: {
        'charge.success': chargeSuccess,
        // ...add other event handlers as needed
      },
      sync: [
        // Example: Product, Plan, Customer as before...
        {
          collection: 'product',
          paystackResourceType: 'product',
          paystackResourceTypeSingular: 'product',
          fields: [
            { fieldPath: 'name', paystackProperty: 'name' },
            { fieldPath: 'description', paystackProperty: 'description' },
            { fieldPath: 'price', paystackProperty: 'price' },
            { fieldPath: 'quantity', paystackProperty: 'quantity' },
          ],
        },
        {
          collection: 'plan',
          paystackResourceType: 'plan',
          paystackResourceTypeSingular: 'plan',
          fields: [
            { fieldPath: 'title', paystackProperty: 'name' },
            { fieldPath: 'amount', paystackProperty: 'amount' },
          ],
        },
        {
          collection: 'customer',
          paystackResourceType: 'customer',
          paystackResourceTypeSingular: 'customer',
          fields: [
            { fieldPath: 'name', paystackProperty: 'first_name' },
            { fieldPath: 'email', paystackProperty: 'email' },
            { fieldPath: 'lastName', paystackProperty: 'last_name' },
            { fieldPath: 'phone', paystackProperty: 'phone' },
          ],
        },
        // // NEW: Transaction, Refund, Order, Subscription Read-Only that can only be updated by hooks dont need to be in the sync field, since this works from payload to paystack
        // {
        //   collection: 'transaction',
        //   paystackResourceType: 'transaction',
        //   paystackResourceTypeSingular: 'transaction',
        //   fields: [
        //     { fieldPath: 'status', paystackProperty: 'status' },
        //     { fieldPath: 'reference', paystackProperty: 'reference' },
        //     { fieldPath: 'amount', paystackProperty: 'amount' },
        //     { fieldPath: 'currency', paystackProperty: 'currency' },
        //     { fieldPath: 'paid_at', paystackProperty: 'paid_at' },
        //     { fieldPath: 'customer_code', paystackProperty: 'customer.customer_code' },
        //     { fieldPath: 'channel', paystackProperty: 'channel' },
        //   ],
        // },
        // {
        //   collection: 'refund',
        //   paystackResourceType: 'refund',
        //   paystackResourceTypeSingular: 'refund',
        //   fields: [
        //     { fieldPath: 'transaction', paystackProperty: 'transaction' },
        //     { fieldPath: 'amount', paystackProperty: 'amount' },
        //     { fieldPath: 'status', paystackProperty: 'status' },
        //     { fieldPath: 'currency', paystackProperty: 'currency' },
        //     { fieldPath: 'refunded_at', paystackProperty: 'refunded_at' },
        //     { fieldPath: 'customer_note', paystackProperty: 'customer_note' },
        //     { fieldPath: 'merchant_note', paystackProperty: 'merchant_note' },
        //   ],
        // },
        // {
        //   collection: 'order',
        //   paystackResourceType: 'order',
        //   paystackResourceTypeSingular: 'order',
        //   fields: [
        //     { fieldPath: 'id', paystackProperty: 'id' },
        //     { fieldPath: 'amount', paystackProperty: 'amount' },
        //     { fieldPath: 'currency', paystackProperty: 'currency' },
        //     { fieldPath: 'status', paystackProperty: 'status' },
        //     { fieldPath: 'customer_code', paystackProperty: 'customer.customer_code' },
        //     { fieldPath: 'created_at', paystackProperty: 'created_at' },
        //   ],
        // },
        // {
        //   collection: 'subscription',
        //   paystackResourceType: 'subscription',
        //   paystackResourceTypeSingular: 'subscription',
        //   fields: [
        //     { fieldPath: 'plan', paystackProperty: 'plan' },
        //     { fieldPath: 'customer_code', paystackProperty: 'customer.customer_code' },
        //     { fieldPath: 'status', paystackProperty: 'status' },
        //     { fieldPath: 'start', paystackProperty: 'start' },
        //     { fieldPath: 'amount', paystackProperty: 'amount' },
        //     { fieldPath: 'subscription_code', paystackProperty: 'subscription_code' },
        //   ],
        // },
      ],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
