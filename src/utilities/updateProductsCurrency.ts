import type { PaystackPluginConfig } from '../types.js'
import { paystackProxy } from './paystackProxy.js'
import { buildPath } from '../utilities/buildPath.js'

export async function updateProductsCurrency(
  pluginConfig: PaystackPluginConfig,
  logger: { info: (msg: string) => void; error: (msg: string) => void },
): Promise<void> {
  if (!pluginConfig.defaultCurrency) {
    logger.error('[paystack-plugin] No default currency set for product updates')
    return
  }

  try {
    // 1. Fetch all products from Paystack
    logger.info('[paystack-plugin] Fetching all products from Paystack')
    const response = await paystackProxy({
      path: '/product',
      secretKey: pluginConfig.paystackSecretKey,
    })

    if (response.status !== 200 || !Array.isArray(response.data)) {
      logger.error(`[paystack-plugin] Failed to fetch products: ${response.message}`)
      return
    }

    const products = response.data
    logger.info(`[paystack-plugin] Found ${products.length} products to update`)

    // 2. Update each product with the new currency
    for (const product of products) {
      const productId = product.id
      logger.info(
        `[paystack-plugin] Updating product ${productId} with currency ${pluginConfig.defaultCurrency}`,
      )

      const updateResponse = await paystackProxy({
        path: buildPath('product', productId),
        method: 'PUT',
        body: { currency: pluginConfig.defaultCurrency },
        secretKey: pluginConfig.paystackSecretKey,
      })

      if (updateResponse.status >= 200 && updateResponse.status < 300) {
        logger.info(`[paystack-plugin] Successfully updated product ${productId}`)
      } else {
        logger.error(
          `[paystack-plugin] Failed to update product ${productId}: ${updateResponse.message}`,
        )
      }
    }

    logger.info('[paystack-plugin] Finished updating product currencies')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[paystack-plugin] Error updating product currencies: ${message}`)
  }
}
