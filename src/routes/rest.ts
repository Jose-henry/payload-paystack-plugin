import type { PayloadRequest } from 'payload'
import { addDataAndFileToRequest, Forbidden } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'

// Centralized Paystack API endpoint definitions
const PaystackEndpoints: Record<
  'customer' | 'plan' | 'product' | 'transaction' | 'refund' | 'order' | 'subscription',
  string
> = {
  customer: '/customer',
  plan: '/plan',
  product: '/product',
  transaction: '/transaction',
  refund: '/refund',
  order: '/order',
  subscription: '/subscription',
}

/**
 * Build a Paystack API path for a resource, optionally including its code/ID
 */
export function buildPath(resource: keyof typeof PaystackEndpoints, code?: string): string {
  const base = PaystackEndpoints[resource]
  return code ? `${base}/${code}` : base
}

export const paystackREST = async (args: {
  pluginConfig: PaystackPluginConfig
  req: PayloadRequest
}): Promise<Response> => {
  const { pluginConfig, req } = args
  await addDataAndFileToRequest(req)
  const logger = new PaystackPluginLogger(req.payload.logger, 'rest')

  const { data, user } = req
  if (!user) throw new Forbidden()

  try {
    // Data.paystackResource and paystackID should drive the endpoint
    const resource = data?.paystackResource as keyof typeof PaystackEndpoints
    const method = ((data?.paystackMethod as string) || 'GET').toUpperCase() as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'

    // Build path using the centralized mapping
    const path = buildPath(resource, data?.paystackID as string)

    const response = await paystackProxy({
      path,
      method,
      body: data?.paystackArgs?.[0],
      secretKey: pluginConfig.paystackSecretKey,
    })
    return Response.json(response, { status: response.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`[paystack-plugin] REST proxy error: ${message}`)
    return Response.json({ status: 500, message }, { status: 500 })
  }
}
