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
        // ←you can add a new blacklisted toggle
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
    // Read-only: Transactions
    {
      slug: 'transaction',
      labels: { singular: 'Transaction', plural: 'Transactions' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'id', type: 'text', label: 'ID' },
        { name: 'status', type: 'text', label: 'Status' },
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'currency', type: 'text', label: 'Currency' },
        { name: 'paid_at', type: 'text', label: 'Paid At' },
        { name: 'customer', type: 'text', label: 'Customer Code' },
      ],
      hooks: {
        afterOperation: [
          async ({ operation, result, req }) => {
            const { paystackProxy } = await import('../src/utilities/paystackProxy.js')
            const secret = process.env.PAYSTACK_SECRET_KEY!
            if (operation === 'find') {
              const resp = await paystackProxy({ path: '/transaction', secretKey: secret })
              if (resp.status === 200 && Array.isArray(resp.data)) {
                return {
                  docs: resp.data.map((t) => ({
                    id: t.id.toString(),
                    status: t.status,
                    amount: t.amount,
                    currency: t.currency,
                    paid_at: t.paid_at,
                    customer: t.customer?.customer_code || '',
                  })),
                  totalDocs: resp.data.length,
                }
              }
            }
            if (operation === 'findByID') {
              const id = result?.doc?.id
              const resp = await paystackProxy({ path: `/transaction/${id}`, secretKey: secret })
              if (resp.status === 200 && resp.data) {
                const t = resp.data
                return {
                  doc: {
                    id: t.id.toString(),
                    status: t.status,
                    amount: t.amount,
                    currency: t.currency,
                    paid_at: t.paid_at,
                    customer: t.customer?.customer_code || '',
                  },
                }
              }
            }
          },
        ],
      },
    },
    // Read-only: Refunds
    {
      slug: 'refund',
      labels: { singular: 'Refund', plural: 'Refunds' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'id', type: 'text', label: 'Refund ID' },
        { name: 'transaction', type: 'text', label: 'Transaction ID' },
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'status', type: 'text', label: 'Status' },
        { name: 'refunded_at', type: 'text', label: 'Refunded At' },
      ],
      hooks: {
        afterOperation: [
          async ({ operation, result, req }) => {
            const { paystackProxy } = await import('../src/utilities/paystackProxy.js')
            const secret = process.env.PAYSTACK_SECRET_KEY!
            if (operation === 'find') {
              const resp = await paystackProxy({ path: '/refund', secretKey: secret })
              if (resp.status === 200 && Array.isArray(resp.data)) {
                return {
                  docs: resp.data.map((r) => ({
                    id: r.id.toString(),
                    transaction: r.transaction.toString(),
                    amount: r.amount,
                    status: r.status,
                    refunded_at: r.refunded_at,
                  })),
                  totalDocs: resp.data.length,
                }
              }
            }
            if (operation === 'findByID') {
              const id = result?.doc?.id
              const resp = await paystackProxy({ path: `/refund/${id}`, secretKey: secret })
              if (resp.status === 200 && resp.data) {
                const r = resp.data
                return {
                  doc: {
                    id: r.id.toString(),
                    transaction: r.transaction.toString(),
                    amount: r.amount,
                    status: r.status,
                    refunded_at: r.refunded_at,
                  },
                }
              }
            }
          },
        ],
      },
    },
    // Read-only: Orders
    {
      slug: 'order',
      labels: { singular: 'Order', plural: 'Orders' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'id', type: 'text', label: 'Order ID' },
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'currency', type: 'text', label: 'Currency' },
        { name: 'status', type: 'text', label: 'Status' },
      ],
      hooks: {
        afterOperation: [
          async ({ operation, result, req }) => {
            const { paystackProxy } = await import('../src/utilities/paystackProxy.js')
            const secret = process.env.PAYSTACK_SECRET_KEY!
            if (operation === 'find') {
              const resp = await paystackProxy({ path: '/order', secretKey: secret })
              if (resp.status === 200 && Array.isArray(resp.data)) {
                return {
                  docs: resp.data.map((o) => ({
                    id: o.id.toString(),
                    amount: o.amount,
                    currency: o.currency,
                    status: o.status,
                  })),
                  totalDocs: resp.data.length,
                }
              }
            }
            if (operation === 'findByID') {
              const id = result?.doc?.id
              const resp = await paystackProxy({ path: `/order/${id}`, secretKey: secret })
              if (resp.status === 200 && resp.data) {
                const o = resp.data
                return {
                  doc: {
                    id: o.id.toString(),
                    amount: o.amount,
                    currency: o.currency,
                    status: o.status,
                  },
                }
              }
            }
          },
        ],
      },
    },
    // Read-only: Subscriptions
    {
      slug: 'subscription',
      labels: { singular: 'Subscription', plural: 'Subscriptions' },
      access: { create: () => false, update: () => false, delete: () => false, read: () => true },
      fields: [
        { name: 'id', type: 'text', label: 'Subscription ID' },
        { name: 'status', type: 'text', label: 'Status' },
        { name: 'plan', type: 'text', label: 'Plan Code' },
        { name: 'customer', type: 'text', label: 'Customer Code' },
        { name: 'start', type: 'text', label: 'Start Date' },
      ],
      hooks: {
        afterOperation: [
          async ({ operation, result, req }) => {
            const { paystackProxy } = await import('../src/utilities/paystackProxy.js')
            const secret = process.env.PAYSTACK_SECRET_KEY!
            if (operation === 'find') {
              const resp = await paystackProxy({ path: '/subscription', secretKey: secret })
              if (resp.status === 200 && Array.isArray(resp.data)) {
                return {
                  docs: resp.data.map((s) => ({
                    id: s.id.toString(),
                    status: s.status,
                    plan: s.plan,
                    customer: s.customer,
                    start: new Date(s.start * 1000).toISOString(),
                  })),
                  totalDocs: resp.data.length,
                }
              }
            }
            if (operation === 'findByID') {
              const id = result?.doc?.id
              const resp = await paystackProxy({ path: `/subscription/${id}`, secretKey: secret })
              if (resp.status === 200 && resp.data) {
                const s = resp.data
                return {
                  doc: {
                    id: s.id.toString(),
                    status: s.status,
                    plan: s.plan,
                    customer: s.customer,
                    start: new Date(s.start * 1000).toISOString(),
                  },
                }
              }
            }
          },
        ],
      },
    },
  ],
  db: mongooseAdapter({ url: process.env.DATABASE_URI || '' }),
  editor: lexicalEditor(),
  email: testEmailAdapter,
  // onInit: async (payload) => {
  //   await seed(payload)
  // },
  plugins: [
    paystackPlugin({
      enabled: true,
      paystackSecretKey: process.env.PAYSTACK_SECRET_KEY!,
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
      rest: true,
      logs: true,
      defaultCurrency: 'NGN',
      updateExistingProductsOnCurrencyChange: false,
      sync: [
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
      ],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
