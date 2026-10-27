declare module '#imports' {
  export const defineNuxtPlugin: typeof import('nuxt/app').defineNuxtPlugin
  export const useAppConfig: typeof import('nuxt/app').useAppConfig
  export const useLocalizedSite: typeof import(
    '../app/composables/useLocalizedSite'
  ).useLocalizedSite
  export function useHead(
    input: () => Partial<import('../core/seo').LocalizedHead>
  ): void
  export function useRoute(): {
    path: string
    fullPath: string
  }
  export function useRuntimeConfig(): {
    public: {
      nuxtJpLocalizedSite: import('../../contracts/types').ResolvedSiteConfig
      nuxtJpMaintenanceEnabled?: boolean
      nuxtJpOssShowcase?: string
      nuxtJpOrganizationShowcase?: string
      nuxtJpPresentation?: import('../core/presentation').PresentationOptions | null
    }
  }
}
