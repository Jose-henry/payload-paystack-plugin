// src/utilities/buildPath.ts

/**
 * Build a Paystack API path for a resource, optionally including its code/ID.
 * For updates/deletes:
 *   - Products: /product/id (numeric ID)
 *   - Plans: /plan/code (plan code)
 *   - Customers: /customer/{code} (as is)
 */
export function buildPath(
  resource: string, // not limited to just specific resources
  code?: string,
  _method?: string, // unused, but kept for API compatibility
): string {
  // Always ensure leading slash
  let base = resource.startsWith('/') ? resource : `/${resource}`
  if (!code) return base
  // For all resources, just use the code/ID directly without colon
  return `${base}/${code}`
}
