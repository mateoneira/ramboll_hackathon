export type ProductMode = 'internal' | 'external'

/**
 * Product mode is a single build switched at runtime:
 *   - URL override:  ?mode=internal | ?mode=external
 *   - Build default: VITE_MODE env var
 *   - Fallback:      'external' (the public-facing sales-funnel framing)
 */
export function getMode(): ProductMode {
  const param = new URLSearchParams(window.location.search).get('mode')
  if (param === 'internal' || param === 'external') return param
  const envMode = import.meta.env.VITE_MODE
  if (envMode === 'internal' || envMode === 'external') return envMode
  return 'external'
}
