import type { PayloadRequest } from 'payload'
import { addDataAndFileToRequest, Forbidden } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'

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
    // Get the raw path and method from the body
    const path = data?.paystackPath as string // e.g., "/transaction/initialize"
    const method = ((data?.paystackMethod as string) || 'GET').toUpperCase() as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'

    if (!path || typeof path !== 'string') {
      throw new Error('Missing or invalid paystackPath')
    }

    // Forward the request to Paystack
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

//example usage
/* await fetch('/paystack/rest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    paystackPath: '/transaction/initialize',
    paystackMethod: 'POST',
    paystackArgs: [{
      email: "demo@test.com",
      amount: 20000
    }]
  })
});
 */
