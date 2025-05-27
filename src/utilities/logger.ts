import type { Payload } from 'payload'

/**
 * A unified logger for the Paystack plugin, adding consistent prefixes
 * and supporting optional context tagging.
 */
export class PaystackPluginLogger {
  private logger: Payload['logger']
  private context?: string

  constructor(logger: Payload['logger'], context?: string) {
    this.logger = logger
    this.context = context
  }

  private prefix(): string {
    const base = '[paystack-plugin]'
    return this.context ? `${base}[${this.context}]` : base
  }

  info(message: string): void {
    this.logger.info(`${this.prefix()} ${message}`)
  }

  error(message: string): void {
    this.logger.error(`${this.prefix()} ${message}`)
  }

  warn(message: string): void {
    this.logger.warn(`${this.prefix()} ${message}`)
  }

  debug(message: string): void {
    // Some Payload logger implementations may not have debug; fallback to info
    if (typeof this.logger.debug === 'function') {
      this.logger.debug(`${this.prefix()} ${message}`)
    } else {
      this.logger.info(`${this.prefix()} [debug] ${message}`)
    }
  }
}
