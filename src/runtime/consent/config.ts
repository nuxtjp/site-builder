/** Public, declarative admission policy. No cookies, scripts or vendor IDs are inferred. */
export interface ConsentScript { src: string; integrity?: string }
export interface ConsentService {
  id: string
  label: string
  purpose: string
  category: 'functional' | 'analytics' | 'marketing'
  scripts: ConsentScript[]
  cookies: string[]
}
export interface ConsentOptions {
  schemaVersion: 1
  policyUrl: string
  policyRevision: string
  services: ConsentService[]
}
function exact(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error('Invalid consent definition')
  return value as Record<string, unknown>
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f<>&]/.test(value)
}
function url(value: unknown): value is string {
  if (!text(value, 2048)) return false
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.hash } catch { return false }
}
export function validateConsent(value: unknown): ConsentOptions {
  const v = exact(value, ['schemaVersion', 'policyUrl', 'policyRevision', 'services'])
  if (v.schemaVersion !== 1 || !url(v.policyUrl) || !text(v.policyRevision, 160) || !Array.isArray(v.services) || v.services.length > 20) throw new Error('Incomplete consent definition')
  const ids = new Set<string>(), urls = new Set<string>()
  for (const item of v.services) {
    const s = exact(item, ['id', 'label', 'purpose', 'category', 'scripts', 'cookies'])
    if (!text(s.id, 64) || !/^[a-z][a-z0-9-]*$/.test(s.id) || ids.has(s.id) || ['constructor', 'prototype'].includes(s.id) || !text(s.label, 120) || !text(s.purpose, 1000) || !['functional', 'analytics', 'marketing'].includes(String(s.category)) || !Array.isArray(s.scripts) || !s.scripts.length || s.scripts.length > 10 || !Array.isArray(s.cookies) || s.cookies.length > 20) throw new Error('Invalid consent service')
    ids.add(s.id)
    for (const item of s.scripts) {
      const script = exact(item, ['src', 'integrity'])
      if (!url(script.src) || urls.has(script.src) || (script.integrity !== undefined && (typeof script.integrity !== 'string' || !/^sha(256|384|512)-[A-Za-z0-9+/]+=*$/.test(script.integrity)))) throw new Error('Invalid consent script')
      urls.add(script.src)
    }
    if (s.cookies.some(name => !text(name, 128) || !/^[A-Za-z0-9_-]+$/.test(name) || name === 'nuxtjp_consent')) throw new Error('Invalid consent cookie')
  }
  // Copy only after validation so build-time objects cannot mutate public config later.
  return JSON.parse(JSON.stringify(v)) as ConsentOptions
}
