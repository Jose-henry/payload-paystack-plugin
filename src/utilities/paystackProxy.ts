import type { PaystackProxy } from '../types.js'

/**
 * Centralized Paystack HTTP client with retries and timeout support.
 */
export const paystackProxy: PaystackProxy = async (args) => {
  const {
    path,
    method = 'GET',
    body,
    secretKey,
    timeoutMs = 10000,
    retries = 2,
    logs = false,
  } = args

  const url = `https://api.paystack.co${path}`

  // Detailed request logging
  if (logs) {
    console.log('\n=== Paystack API Request ===')
    console.log('URL:', url)
    console.log('Method:', method)
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('API Key:', secretKey ? `Bearer ${secretKey.substring(0, 8)}...` : 'Missing')
    console.log('===========================\n')
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${secretKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      let json: any
      try {
        json = await res.json()
        // Detailed response logging
        if (logs) {
          console.log('\n=== Paystack API Response ===')
          console.log('Status:', res.status)
          console.log('Headers:', Object.fromEntries(res.headers.entries()))
          console.log('Response:', JSON.stringify(json, null, 2))
          console.log('===========================\n')
        }
      } catch {
        if (logs) {
          console.log('\n=== Paystack API Error ===')
          console.log('Status:', res.status)
          console.log('Non-JSON response')
          console.log('===========================\n')
        }
        return { status: res.status, message: `HTTP ${res.status}` }
      }

      if (!res.ok) {
        return {
          status: res.status,
          message: json.message || `Paystack API Error (${res.status})`,
        }
      }

      return {
        status: res.status,
        data: json.data,
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === 'AbortError'
      // On last retry, bubble up the error as message
      if (attempt === retries) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          status: 500,
          message: isAbort ? `Request timed out after ${timeoutMs}ms` : `Network error: ${message}`,
        }
      }
      // Otherwise, loop to retry
    }
  }

  // Should not reach here
  return { status: 500, message: 'Unexpected error in paystackProxy' }
}
