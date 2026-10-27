import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'
export default defineNuxtConfig({
  modules: [[fileURLToPath(new URL('../../../dist/runtime/consent/module.js', import.meta.url)), {
    schemaVersion: 1,
    defaultLocale: process.env.CONSENT_FIXTURE_DEFAULT_LOCALE === 'en' ? 'en' : 'ja',
    policyUrl: 'https://hat-tech.co.jp/privacy',
    policyRevision: process.env.CONSENT_FIXTURE_REVISION || 'fixture-1',
    services: process.env.CONSENT_FIXTURE_EMPTY === '1' ? [] : [{
      id: 'metrics', label: 'Test metrics', purpose: 'Synthetic test only', category: 'analytics',
      scripts: [{ src: 'https://metrics.example/analytics.js' }], cookies: ['metrics_id']
    }]
  }]],
  compatibilityDate: '2026-10-27', telemetry: false, devtools: { enabled: false }
})
