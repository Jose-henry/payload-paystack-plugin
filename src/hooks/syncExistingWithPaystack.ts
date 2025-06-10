import type { CollectionBeforeChangeHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { deepen } from '../utilities/deepen.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'
import { buildPath } from '../utilities/buildPath.js'

export const syncExistingWithPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, operation, collection, req }) => {
    const syncConfig = pluginConfig.sync?.find((c) => c.collection === collection.slug)
    const logger = new PaystackPluginLogger(req.payload.logger, pluginConfig, 'update')

    // Only log if logs are enabled
    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [update-hook] Operation: ${operation}`)
      logger.info(`[paystack-plugin] [update-hook] HTTP Method: ${req.method}`)
      logger.info(`[paystack-plugin] [update-hook] Has sync config: ${!!syncConfig}`)
      logger.info(`[paystack-plugin] [update-hook] Skip sync: ${!!data?.skipSync}`)
      //logger.info(`[paystack-plugin] [update-hook] Context skip sync: ${!!req.context?.skipSync}`)
      logger.info(`[paystack-plugin] [update-hook] Test mode: ${!!pluginConfig.testMode}`)
    }

    // Check if this is an update operation and if Payload used PATCH
    if (
      !syncConfig ||
      pluginConfig.testMode ||
      data?.skipSync ||
      req.context?.skipSync ||
      operation !== 'update' ||
      req.method !== 'PATCH'
    ) {
      if (pluginConfig.logs) {
        const skipReasons = []
        if (!syncConfig) skipReasons.push('no sync config')
        if (pluginConfig.testMode) skipReasons.push('test mode')
        if (data?.skipSync) skipReasons.push('skipSync flag')
        if (req.context?.skipSync) skipReasons.push('context skipSync flag')
        if (operation !== 'update') skipReasons.push('not an update operation')
        if (req.method !== 'PATCH') skipReasons.push('not a PATCH request')

        if (skipReasons.length > 0) {
          logger.info(
            `[paystack-plugin] [update-hook] Skipping sync hook due to: ${skipReasons.join(', ')}`,
          )
        }
      }
      return data
    }

    // Helper function to create a new record in Paystack
    const createNewPaystackRecord = async (completeData: any) => {
      // Build request body from field mappings
      const body = deepen(
        syncConfig.fields.reduce(
          (acc, { fieldPath, paystackProperty }) => {
            const value = completeData[fieldPath]
            if (value && (paystackProperty === 'amount' || paystackProperty === 'price')) {
              acc[paystackProperty] = value * 100
            } else {
              acc[paystackProperty] = value
            }
            return acc
          },
          {} as Record<string, any>,
        ),
      )

      // Add currency for products
      if (syncConfig.paystackResourceType === 'product' && pluginConfig.defaultCurrency) {
        body.currency = pluginConfig.defaultCurrency
      }

      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] Creating new ${syncConfig.paystackResourceType} in Paystack`,
        )
        logger.info(
          `[paystack-plugin] [update-hook] Request body: ${JSON.stringify(body, null, 2)}`,
        )
      }

      // Call Paystack to create the record
      const path = buildPath(syncConfig.paystackResourceType as any)
      if (pluginConfig.logs) {
        logger.info(`[paystack-plugin] [update-hook] Calling Paystack API: ${path}`)
      }

      const response = await paystackProxy({
        path,
        method: 'POST',
        body,
        secretKey: pluginConfig.paystackSecretKey,
        logs: pluginConfig.logs,
      })

      // Grab the correct *_code field
      const codeField = `${syncConfig.paystackResourceTypeSingular}_code`
      const codeValue = response.data?.[codeField]

      if (response.status >= 200 && response.status < 300 && codeValue) {
        let paystackID: string

        // For products, store the numeric ID instead of the product_code
        if (
          (syncConfig.paystackResourceType === 'product' ||
            syncConfig.paystackResourceType === 'plan') &&
          response.data?.id
        ) {
          paystackID = response.data.id.toString()
        } else {
          paystackID = codeValue
        }

        // Set the PaystackID in the data
        data.paystackID = paystackID

        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] [update-hook] Created Paystack ID '${paystackID}'`)
        }

        return true
      } else {
        logger.error(
          `[paystack-plugin] [update-hook] Error creating Paystack ${syncConfig.paystackResourceType}: ${response.message} - Response: ${JSON.stringify(response)}`,
        )
        return false
      }
    }

    // If no paystackID exists but record has an id, create a new record in Paystack
    if (!originalDoc?.paystackID && originalDoc?.id && !data?.skipSync && req.method === 'PATCH') {
      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] No paystackID found but record exists (id: ${originalDoc.id}), creating new record in Paystack`,
        )
      }

      // Merge originalDoc with incoming changes for complete data
      const completeData = { ...originalDoc, ...data }
      await createNewPaystackRecord(completeData)
      return data
    }

    // Handle existing Paystack records - try to update, create new if not found
    const existingPaystackID = originalDoc?.paystackID || data.paystackID
    if (existingPaystackID) {
      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] Attempting to update '${collection.slug}' Paystack ID '${existingPaystackID}'`,
        )
      }

      // Only include fields that actually changed
      const toUpdate = deepen(
        syncConfig.fields.reduce(
          (acc, { fieldPath, paystackProperty }) => {
            // Check if field exists in incoming data (was changed)
            if (data[fieldPath] !== undefined && data[fieldPath] !== originalDoc?.[fieldPath]) {
              const value = data[fieldPath]
              if (value && (paystackProperty === 'amount' || paystackProperty === 'price')) {
                acc[paystackProperty] = value * 100
              } else {
                acc[paystackProperty] = value
              }
            }
            return acc
          },
          {} as Record<string, any>,
        ),
      )

      // Add currency for products if it's not already included
      if (
        syncConfig.paystackResourceType === 'product' &&
        pluginConfig.defaultCurrency &&
        !toUpdate.currency
      ) {
        toUpdate.currency = pluginConfig.defaultCurrency
      }

      if (pluginConfig.logs) {
        logger.info(`[paystack-plugin] [update-hook] Fields to update: ${JSON.stringify(toUpdate)}`)
      }

      if (Object.keys(toUpdate).length) {
        const updatePath = buildPath(
          syncConfig.paystackResourceType as any,
          existingPaystackID,
          'PUT',
        )
        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] [update-hook] Calling Paystack API: ${updatePath}`)
        }

        try {
          const updateResponse = await paystackProxy({
            path: updatePath,
            method: 'PUT',
            body: toUpdate,
            secretKey: pluginConfig.paystackSecretKey,
            logs: pluginConfig.logs,
          })

          if (updateResponse.status >= 200 && updateResponse.status < 300) {
            if (pluginConfig.logs) {
              logger.info(
                `[paystack-plugin] [update-hook] Successfully updated Paystack ID '${existingPaystackID}'`,
              )
            }
          } else {
            // Check if the error indicates the record doesn't exist
            const errorMessage = updateResponse.message?.toLowerCase() || ''
            const isNotFoundError =
              updateResponse.status === 404 ||
              errorMessage.includes('not found') ||
              errorMessage.includes('does not exist') ||
              errorMessage.includes('invalid') ||
              errorMessage.includes('customer not found') ||
              errorMessage.includes('product not found') ||
              errorMessage.includes('plan not found')

            if (isNotFoundError) {
              if (pluginConfig.logs) {
                logger.info(
                  `[paystack-plugin] [update-hook] Paystack ID '${existingPaystackID}' not found. Creating new record.`,
                )
              }

              // Merge originalDoc with incoming changes for complete data
              const completeData = { ...originalDoc, ...data }
              const created = await createNewPaystackRecord(completeData)

              if (!created) {
                logger.error(
                  `[paystack-plugin] [update-hook] Failed to create new Paystack record for missing ID '${existingPaystackID}'`,
                )
              }
            } else {
              logger.error(
                `[paystack-plugin] [update-hook] Error updating Paystack ${syncConfig.paystackResourceType}: ${updateResponse.message}`,
              )
            }
          }
        } catch (error) {
          logger.error(
            `[paystack-plugin] [update-hook] Exception during update for Paystack ID '${existingPaystackID}': ${error instanceof Error ? error.message : String(error)}`,
          )

          // If it's a network error or other exception, we could still try to create a new record
          // but let's be conservative and only do this for specific error types
          if (pluginConfig.logs) {
            logger.info(
              `[paystack-plugin] [update-hook] Attempting to create new record due to update exception`,
            )
          }

          // Merge originalDoc with incoming changes for complete data
          const completeData = { ...originalDoc, ...data }
          await createNewPaystackRecord(completeData)
        }
      } else if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] No changes to sync for Paystack ID '${existingPaystackID}'`,
        )
      }
    }

    return data
  }

/* 
  
  import type { CollectionBeforeChangeHook } from 'payload'
import type { PaystackPluginConfig } from '../types.js'
import { deepen } from '../utilities/deepen.js'
import { paystackProxy } from '../utilities/paystackProxy.js'
import { PaystackPluginLogger } from '../utilities/logger.js'
import { buildPath } from '../utilities/buildPath.js'

export const syncExistingWithPaystack =
  (pluginConfig: PaystackPluginConfig): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, operation, collection, req }) => {
    const syncConfig = pluginConfig.sync?.find((c) => c.collection === collection.slug)
    const logger = new PaystackPluginLogger(req.payload.logger, pluginConfig, 'update')

    // Only log if logs are enabled
    if (pluginConfig.logs) {
      logger.info(`[paystack-plugin] [update-hook] Operation: ${operation}`)
      logger.info(`[paystack-plugin] [update-hook] HTTP Method: ${req.method}`)
      logger.info(`[paystack-plugin] [update-hook] Has sync config: ${!!syncConfig}`)
      logger.info(`[paystack-plugin] [update-hook] Skip sync: ${!!data?.skipSync}`)
      logger.info(`[paystack-plugin] [update-hook] Context skip sync: ${!!req.context?.skipSync}`)
      logger.info(`[paystack-plugin] [update-hook] Test mode: ${!!pluginConfig.testMode}`)
    }

    // Check if this is an update operation and if Payload used PATCH
    if (
      !syncConfig ||
      pluginConfig.testMode ||
      data?.skipSync ||
      req.context?.skipSync ||
      operation !== 'update' ||
      req.method !== 'PATCH'
    ) {
      if (pluginConfig.logs) {
        const skipReasons = []
        if (!syncConfig) skipReasons.push('no sync config')
        if (pluginConfig.testMode) skipReasons.push('test mode')
        if (data?.skipSync) skipReasons.push('skipSync flag')
        if (req.context?.skipSync) skipReasons.push('context skipSync flag')
        if (operation !== 'update') skipReasons.push('not an update operation')
        if (req.method !== 'PATCH') skipReasons.push('not a PATCH request')

        if (skipReasons.length > 0) {
          logger.info(
            `[paystack-plugin] [update-hook] Skipping sync hook due to: ${skipReasons.join(', ')}`,
          )
        }
      }
      return data
    }

    // If no paystackID exists but record has an id, create a new record in Paystack
    if (!originalDoc?.paystackID && originalDoc?.id && !data?.skipSync && req.method === 'PATCH') {
      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] No paystackID found but record exists (id: ${originalDoc.id}), creating new record in Paystack`,
        )
      }

      // Merge originalDoc with incoming changes for complete data
      const completeData = { ...originalDoc, ...data }

      // Build request body from your field mappings
      const body = deepen(
        syncConfig.fields.reduce(
          (acc, { fieldPath, paystackProperty }) => {
            const value = completeData[fieldPath]
            if (value && (paystackProperty === 'amount' || paystackProperty === 'price')) {
              acc[paystackProperty] = value * 100
            } else {
              acc[paystackProperty] = value
            }
            return acc
          },
          {} as Record<string, any>,
        ),
      )

      // Add currency for products
      if (syncConfig.paystackResourceType === 'product' && pluginConfig.defaultCurrency) {
        body.currency = pluginConfig.defaultCurrency
      }

      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] Creating new ${syncConfig.paystackResourceType} in Paystack`,
        )
        logger.info(
          `[paystack-plugin] [update-hook] Request body: ${JSON.stringify(body, null, 2)}`,
        )
      }

      // Call Paystack to create the record
      const path = buildPath(syncConfig.paystackResourceType as any)
      if (pluginConfig.logs) {
        logger.info(`[paystack-plugin] [update-hook] Calling Paystack API: ${path}`)
      }
      const response = await paystackProxy({
        path,
        method: 'POST',
        body,
        secretKey: pluginConfig.paystackSecretKey,
        logs: pluginConfig.logs,
      })

      // Grab the correct *_code field
      const codeField = `${syncConfig.paystackResourceTypeSingular}_code`
      const codeValue = response.data?.[codeField]

      if (response.status >= 200 && response.status < 300 && codeValue) {
        let paystackID: string

        // For products, store the numeric ID instead of the product_code
        if (
          (syncConfig.paystackResourceType === 'product' ||
            syncConfig.paystackResourceType === 'plan') &&
          response.data?.id
        ) {
          paystackID = response.data.id.toString()
        } else {
          paystackID = codeValue
        }

        // ✅ SET THE PAYSTACKID IN THE DATA (no separate database call needed)
        data.paystackID = paystackID

        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] [update-hook] Created Paystack ID '${paystackID}'`)
        }
      } else {
        logger.error(
          `[paystack-plugin] [update-hook] Error creating Paystack ${syncConfig.paystackResourceType}: ${response.message} - Response: ${JSON.stringify(response)}`,
        )
      }
      return data
    }

    // Handle existing Paystack records - update them
    const existingPaystackID = originalDoc?.paystackID || data.paystackID
    if (existingPaystackID) {
      if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] Updating '${collection.slug}' ID '${existingPaystackID}'`,
        )
      }

      // Only include fields that actually changed
      const toUpdate = deepen(
        syncConfig.fields.reduce(
          (acc, { fieldPath, paystackProperty }) => {
            // Check if field exists in incoming data (was changed)
            if (data[fieldPath] !== undefined && data[fieldPath] !== originalDoc?.[fieldPath]) {
              const value = data[fieldPath]
              if (value && (paystackProperty === 'amount' || paystackProperty === 'price')) {
                acc[paystackProperty] = value * 100
              } else {
                acc[paystackProperty] = value
              }
            }
            return acc
          },
          {} as Record<string, any>,
        ),
      )

      // Add currency for products if it's not already included
      if (
        syncConfig.paystackResourceType === 'product' &&
        pluginConfig.defaultCurrency &&
        !toUpdate.currency
      ) {
        toUpdate.currency = pluginConfig.defaultCurrency
      }

      if (pluginConfig.logs) {
        logger.info(`[paystack-plugin] [update-hook] Fields to update: ${JSON.stringify(toUpdate)}`)
      }

      if (Object.keys(toUpdate).length) {
        const path = buildPath(syncConfig.paystackResourceType as any, existingPaystackID, 'PUT')
        if (pluginConfig.logs) {
          logger.info(`[paystack-plugin] [update-hook] Calling Paystack API: ${path}`)
        }
        const response = await paystackProxy({
          path,
          method: 'PUT',
          body: toUpdate,
          secretKey: pluginConfig.paystackSecretKey,
          logs: pluginConfig.logs,
        })

        if (response.status >= 200 && response.status < 300) {
          if (pluginConfig.logs) {
            logger.info(
              `[paystack-plugin] [update-hook] Updated Paystack ID '${existingPaystackID}'`,
            )
          }
        } else {
          logger.error(
            `[paystack-plugin] [update-hook] Error updating Paystack ${syncConfig.paystackResourceType}: ${response.message}`,
          )
        }
      } else if (pluginConfig.logs) {
        logger.info(
          `[paystack-plugin] [update-hook] No changes to sync for Paystack ID '${existingPaystackID}'`,
        )
      }
    }

    return data
  }
  
  */
