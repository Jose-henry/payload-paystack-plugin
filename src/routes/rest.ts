import { Forbidden, type PayloadRequest } from 'payload'
import type { PaystackPluginConfig } from '../types.js'


import { paystackProxy } from '../utilities/paystackProxy.js'

export const paystackREST = async (args: {
  req: PayloadRequest
  pluginConfig: PaystackPluginConfig
}) => {
  const { req, pluginConfig } = args
  const { paystackSecretKey } = pluginConfig

  let status = 200
  let responseBody

  try {
    const { user, data } = req

    if (!user) throw new Forbidden()

    const proxyResponse = await paystackProxy({
      method: data?.paystackMethod,
      args: data?.paystackArgs,
      secretKey: paystackSecretKey,
    })

    status = proxyResponse.status
    responseBody = proxyResponse
  } catch (err) {
    req.payload.logger.error(`Paystack REST error: ${err}`)
    status = 500
    responseBody = { message: String(err) }
  }

  return Response.json(responseBody, { status })
}
