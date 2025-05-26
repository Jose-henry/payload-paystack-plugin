import type { Payload } from 'payload'
import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'customer',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!totalDocs) {
    await payload.create({
      collection: 'customer',
      data: devUser,
    })
  }

  await payload.create({
    collection: 'plan',
    data: {
      title: 'Seed Plan',
      amount: 5000,
    },
  })

  await payload.create({
    collection: 'customer',
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'pass1234',
    },
  })

  payload.logger.info('✅ Seed data added.')
}
