import type { Payload } from 'payload'
import type { PaystackPluginConfig } from '../types.js'

/**
 * A unified logger for the Paystack plugin, adding consistent prefixes
 * and supporting optional context tagging.
 */
export class PaystackPluginLogger {
  private logger: Payload['logger']
  private context?: string
  private config: PaystackPluginConfig

  constructor(logger: Payload['logger'], config: PaystackPluginConfig, context?: string) {
    this.logger = logger
    this.context = context
    this.config = config
  }

  private prefix(): string {
    const base = '[paystack-plugin]'
    return this.context ? `${base}[${this.context}]` : base
  }

  private shouldLog(): boolean {
    return this.config.logs !== false
  }

  info(message: string): void {
    if (this.shouldLog()) {
      this.logger.info(`${this.prefix()} ${message}`)
    }
  }

  error(message: string): void {
    if (this.shouldLog()) {
      this.logger.error(`${this.prefix()} ${message}`)
    }
  }

  warn(message: string): void {
    if (this.shouldLog()) {
      this.logger.warn(`${this.prefix()} ${message}`)
    }
  }

  debug(message: string): void {
    if (this.shouldLog()) {
      // Some Payload logger implementations may not have debug; fallback to info
      if (typeof this.logger.debug === 'function') {
        this.logger.debug(`${this.prefix()} ${message}`)
      } else {
        this.logger.info(`${this.prefix()} [debug] ${message}`)
      }
    }
  }
}
