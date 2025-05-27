import type { Payload } from 'payload'
import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload) => {
  // Create dev user if not exists
  const { totalDocs: devUserExists } = await payload.count({
    collection: 'customer',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!devUserExists) {
    await payload.create({
      collection: 'customer',
      data: devUser,
    })
  }

  // Create test products
  const testProducts = [
    {
      name: 'Premium Plan',
      description: 'Access to all premium features',
      price: 10000, // 10,000 NGN (will be converted to 1,000,000 kobo)
      quantity: 1,
    },
    {
      name: 'Basic Plan',
      description: 'Basic features access',
      price: 5000, // 5,000 NGN (will be converted to 500,000 kobo)
      quantity: 1,
    },
  ]

  for (const product of testProducts) {
    const { totalDocs: productExists } = await payload.count({
      collection: 'product',
      where: {
        name: {
          equals: product.name,
        },
      },
    })

    if (!productExists) {
      await payload.create({
        collection: 'product',
        data: product,
      })
    }
  }

  // Create test customer if not exists
  const { totalDocs: testUserExists } = await payload.count({
    collection: 'customer',
    where: {
      email: {
        equals: 'john@example.com',
      },
    },
  })

  if (!testUserExists) {
    await payload.create({
      collection: 'customer',
      data: {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+2348123456789',
        password: 'pass1234',
      },
    })
  }

  payload.logger.info('✅ Seed data added.')
}
