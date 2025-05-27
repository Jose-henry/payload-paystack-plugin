import crypto from 'crypto'

/**
 * Verifies that a given Paystack webhook payload originated from Paystack
 * by validating the HMAC SHA512 signature.
 *
 * @param rawBody - The raw request body, as a string
 * @param signatureHeader - Value of the 'x-paystack-signature' header
 * @param secret - Your Paystack secret key (same as your API key)
 * @returns true if the signature is valid, false otherwise
 */
export function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false

  // Compute HMAC SHA512 over the raw body
  const computed = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex')

  // Timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signatureHeader, 'hex'))
}
