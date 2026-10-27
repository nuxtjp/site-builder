import { defineNuxtPlugin, useAppConfig } from '#imports'
import * as CookieConsent from 'vanilla-cookieconsent'
import type { CookieConsentConfig } from 'vanilla-cookieconsent'
import { validateConsent, type ConsentOptions } from './config'
import { translations } from './translations'
export default defineNuxtPlugin(nuxt => {
  const raw = useAppConfig().nuxtJpConsent as ConsentOptions & { revision: number }
  const { revision, ...definition } = raw
  const options = validateConsent(definition)
  const installed = new Map<string, HTMLScriptElement[]>()
  const rejected = new Set<string>()
  let reloading = false
  const categories: NonNullable<CookieConsentConfig['categories']> = { necessary: { enabled: true, readOnly: true } }
  for (const service of options.services) {
    categories[service.category] ??= { enabled: false, services: {} }
    categories[service.category]!.services![service.id] = {
      label: service.label,
      onAccept: () => {
        if (installed.has(service.id) || reloading) return
        // A library callback alone is not proof that browser storage succeeded.
        // Never start optional communication from an unpersisted selection.
        try {
          const stored = JSON.parse(localStorage.getItem('nuxtjp_consent') || 'null')
          if (stored?.revision !== revision || !(stored.expirationTime > Date.now()) || !stored.services?.[service.category]?.includes(service.id)) return
        } catch { return }
        const elements: HTMLScriptElement[] = []
        installed.set(service.id, elements)
        rejected.delete(service.id)
        for (const resource of service.scripts) {
          const script = document.createElement('script')
          script.src = resource.src; script.async = false
          script.referrerPolicy = 'no-referrer'; script.crossOrigin = 'anonymous'
          if (resource.integrity) script.integrity = resource.integrity
          script.dataset.nuxtjpConsentService = service.id
          elements.push(script); document.head.append(script)
        }
      },
      onReject: () => {
        if (!installed.has(service.id)) return
        rejected.add(service.id)
        installed.get(service.id)!.forEach(script => script.remove())
      },
      cookies: service.cookies.map(name => ({ name }))
    }
  }
  const language = () => /^\/en(?:\/|$)/.test(window.location.pathname) ? 'en' : 'ja'
  const label = () => language() === 'en' ? 'Privacy settings' : 'プライバシー設定'
  let button: HTMLButtonElement
  let available = false
  nuxt.hooks.hookOnce('app:mounted', async () => {
    button = document.createElement('button'); button.type = 'button'
    button.className = 'nuxtjp-consent-settings'; button.textContent = label()
    button.addEventListener('click', () => { if (available) CookieConsent.showPreferences() })
    document.body.append(button)
    try {
      localStorage.setItem('nuxtjp_consent_probe', '1')
      localStorage.removeItem('nuxtjp_consent_probe')
      await CookieConsent.run({
      mode: 'opt-in', autoShow: options.services.length > 0, hideFromBots: false,
      manageScriptTags: false, revision, autoClearCookies: true,
      cookie: { name: 'nuxtjp_consent', useLocalStorage: true, path: '/', sameSite: 'Lax', expiresAfterDays: 180 },
      categories,
      guiOptions: { consentModal: { layout: 'box', position: 'bottom right', equalWeightButtons: true }, preferencesModal: { layout: 'box', equalWeightButtons: true } },
      language: { default: language(), translations: { ja: translations(options, false), en: translations(options, true) } },
      onChange: () => {
        // Removing a script cannot stop its running timers/listeners. Reload only after the
        // new choice is persisted so revoked services cannot restart on the next document.
        if (rejected.size && !reloading) { reloading = true; window.location.reload() }
      }
      })
      available = true
    } catch {
      button.disabled = true
      const status = document.createElement('p'); status.className = 'nuxtjp-consent-storage-error'; status.setAttribute('role', 'status')
      status.textContent = language() === 'en' ? 'Privacy choices cannot be saved. Optional services remain disabled. ' : '設定を保存できないため、任意のサービスは無効です。'
      const policy = document.createElement('a'); policy.href = options.policyUrl; policy.textContent = language() === 'en' ? 'Privacy policy' : '共通プライバシーポリシー'
      status.append(policy); document.body.append(status)
    }
  })
  nuxt.hook('page:finish', () => { if (button) { button.textContent = label(); if (available) void CookieConsent.setLanguage(language()) } })
})
