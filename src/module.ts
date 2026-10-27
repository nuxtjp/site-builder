import { resolve } from 'node:path'
import {
  addComponent,
  addImports,
  addLayout,
  addPlugin,
  installModule,
  addPrerenderRoutes,
  createResolver,
  defineNuxtModule,
  extendPages
} from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'
import type { ConsentOptions } from './runtime/consent/config'
import type { ResolvedSiteConfig } from './contracts/types'
import { siteRoutes, localePath } from './runtime/core/path'
import { loadOrganizationShowcase } from '../organization/index.mjs'
import { validatePresentation, type PresentationOptions } from './runtime/core/presentation'

export interface ModuleOptions {
  consent?: ConsentOptions
  contentRoot?: string
  maintenance?: boolean
  presentation?: PresentationOptions
}

interface ValidatorModule {
  loadSiteConfig(contentRoot: string): ResolvedSiteConfig
}

// CLI and Nuxt setup share one packaged validator without duplicating its bundle.
async function loadValidator(): Promise<ValidatorModule> {
  const validatorUrl = new URL('../validator/content/index.js', import.meta.url)
  return await import(validatorUrl.href) as ValidatorModule
}

const localizedSiteModule: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxtjp/localized-site',
    configKey: 'nuxtJpLocalizedSite',
    compatibility: { nuxt: '^4.6.2' }
  },
  defaults: {},
  async setup(options, nuxt) {
    if (!options.contentRoot) {
      throw new Error('nuxtJpLocalizedSite.contentRoot must be declared explicitly')
    }
    const resolver = createResolver(import.meta.url)
    if (options.consent) await installModule(resolver.resolve('./runtime/consent/module'), options.consent)
    const { loadSiteConfig } = await loadValidator()
    const config = loadSiteConfig(resolve(nuxt.options.rootDir, options.contentRoot))
    const pageFile = resolver.resolve('./runtime/app/pages/LocalizedContentPage.vue')
    const routes = siteRoutes(config)
    const presentation = validatePresentation(options.presentation)
    const layout = presentation ? 'editorial-site' : 'localized-site'
    nuxt.options.runtimeConfig.public.nuxtJpPresentation = presentation
    const showcase = presentation?.scope === 'product' ? null : await loadOrganizationShowcase(resolve(nuxt.options.rootDir, options.contentRoot))
    nuxt.options.runtimeConfig.public.nuxtJpOssShowcase = showcase ? JSON.stringify(showcase) : ''
    const organizations = presentation?.scope === 'product' ? null : await loadOrganizationShowcase(resolve(nuxt.options.rootDir, options.contentRoot), 'organizations.json')
    nuxt.options.runtimeConfig.public.nuxtJpOrganizationShowcase = organizations ? JSON.stringify(organizations) : ''
    nuxt.options.runtimeConfig.public.nuxtJpMaintenanceEnabled = options.maintenance !== false

    nuxt.options.runtimeConfig.public.nuxtJpLocalizedSite = config
    addLayout(resolver.resolve('./runtime/app/layouts/localized-site.vue'), 'localized-site')
    if (presentation) addLayout(resolver.resolve('./runtime/app/layouts/editorial-site.vue'), 'editorial-site')
    addComponent({
      name: 'NuxtJpLocalizedLanguageSwitcher',
      filePath: resolver.resolve(
        './runtime/app/components/LocalizedLanguageSwitcher.vue'
      )
    })
    addComponent({
      name: 'NuxtJpPublicMaintenanceNotice',
      filePath: resolver.resolve(
        './runtime/app/components/PublicMaintenanceNotice.vue'
      )
    })
    addComponent({ name: 'NuxtJpOssShowcase', filePath: resolver.resolve('./runtime/app/components/OssShowcase.vue') })
    addComponent({ name: 'NuxtJpDownloadSummary', filePath: resolver.resolve('./runtime/app/components/DownloadSummary.vue') })
    addPlugin(resolver.resolve('./runtime/app/plugins/localized-head'))
    addImports([
      {
        name: 'useLocalizedSite',
        from: resolver.resolve('./runtime/app/composables/useLocalizedSite')
      },
      {
        name: 'useLocalizedMessages',
        from: resolver.resolve('./runtime/app/composables/useLocalizedMessages')
      },
      {
        name: 'defineLocalizedMessages',
        from: resolver.resolve('./runtime/core/messages')
      }
    ])
    extendPages(pages => {
      const occupied = new Set(pages.map(page => page.path))
      for (const [index, path] of routes.entries()) {
        if (occupied.has(path)) {
          throw new Error(`@nuxtjp/localized-site route conflicts with consumer page: ${path}`)
        }
        pages.push({
          name: `nuxtjp-localized-site-${index}`,
          path,
          file: pageFile,
          meta: { layout }
        })
      }
    })
    if (showcase) {
      const catalogRoutes = config.locales.flatMap(locale => [
        localePath('/oss', locale, config),
        ...(presentation?.scope === 'portfolio' ? [] : showcase.entries.map(entry => localePath(`/oss/${entry.id}`, locale, config)))
      ])
      extendPages(pages => {
        const occupied = new Set(pages.map(page => page.path))
        for (const [index, path] of catalogRoutes.entries()) {
          if (occupied.has(path)) throw new Error(`Showcase route conflicts: ${path}`)
          pages.push({ name: `nuxtjp-showcase-${index}`, path,
            file: resolver.resolve('./runtime/app/pages/OssPage.vue'),
            meta: { layout } })
        }
      })
      addPrerenderRoutes(catalogRoutes)
    }
    addPrerenderRoutes(routes)
    const stylesheet = resolver.resolve('./runtime/app/assets/localized-site.css')
    if (!nuxt.options.css.includes(stylesheet)) nuxt.options.css.push(stylesheet)
    if (presentation) nuxt.options.css.push(resolver.resolve('./runtime/app/assets/editorial-site.css'))
  }
})

export default localizedSiteModule
export type {
  ResolvedSiteConfig,
  SiteConfig,
  SupportedLocale
} from './contracts/types'
