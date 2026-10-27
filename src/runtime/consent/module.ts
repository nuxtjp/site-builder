import { createHash } from 'node:crypto'
import { addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'
import { validateConsent, type ConsentOptions } from './config'
export type { ConsentOptions, ConsentService, ConsentScript } from './config'
const consentModule: NuxtModule<ConsentOptions> = defineNuxtModule<ConsentOptions>({
  meta: { name: '@nuxtjp/localized-site/consent', configKey: 'nuxtJpConsent' },
  setup(input, nuxt) {
    const options = validateConsent(input)
    const revision = Number.parseInt(createHash('sha256').update(JSON.stringify(options)).digest('hex').slice(0, 12), 16) || 1
    nuxt.options.appConfig.nuxtJpConsent = { ...options, revision }
    const resolver = createResolver(import.meta.url)
    nuxt.options.css.push('vanilla-cookieconsent/dist/cookieconsent.css', resolver.resolve('./controls.css'))
    addPlugin({ src: resolver.resolve('./plugin.client'), mode: 'client' })
    nuxt.hook('modules:done', () => {
      // A normal <script src> can start before the client plugin. Never silently gate it too late.
      for (const script of nuxt.options.app.head.script ?? []) {
        if (script.src && /^(?:https?:)?\/\//i.test(String(script.src))) throw new Error('Declare optional remote scripts in the consent definition, not app.head')
      }
      for (const link of nuxt.options.app.head.link ?? []) {
        if (['preconnect', 'dns-prefetch'].includes(String(link.rel)) && options.services.some(s => s.scripts.some(script => new URL(script.src).origin === new URL(String(link.href), 'https://invalid.local').origin))) throw new Error('Optional service connection hints bypass consent')
      }
    })
  }
})
export default consentModule
