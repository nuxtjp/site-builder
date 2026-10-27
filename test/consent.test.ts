import { describe, expect, it } from 'vitest'
import { validateConsent, consentLanguage } from '../src/runtime/consent/config'
import { translations } from '../src/runtime/consent/translations'
const base = { schemaVersion: 1, policyUrl: 'https://hat-tech.co.jp/privacy', policyRevision: 'contact-policy-review-1', services: [] }
const service = { id: 'metrics', label: 'Example metrics', purpose: 'Count page visits', category: 'analytics', scripts: [{src:'https://metrics.example/script.js'}], cookies: ['metrics_id'] }
describe('consent definition', () => {
  it('requires explicit purposes and safe executable resources', () => {
    expect(validateConsent(base).services).toEqual([])
    expect(validateConsent({...base,services:[service]}).services).toHaveLength(1)
    for (const patch of [{schemaVersion:2},{policyUrl:'javascript:alert(1)'},{apiToken:'secret'},{policyRevision:''},{services:[{...service,category:'necessary'}]},{services:[{...service,purpose:''}]},{services:[{...service,label:'<img src=x>'}]},{services:[{...service,scripts:[{src:'http://metrics.example/script.js'}]}]},{services:[{...service,cookies:['nuxtjp_consent']}]},{services:[service,service]}]) expect(()=>validateConsent({...base,...patch})).toThrow()
  })
  it('copies configuration and exposes balanced localized controls and policy link', () => {
    const input={...base,services:[structuredClone(service)]}
    const config=validateConsent(input)
    input.services[0]!.purpose='changed'
    expect(config.services[0]!.purpose).toBe('Count page visits')
    for(const en of [false,true]) {
      const language=translations(config,en)
      expect(language.consentModal?.acceptAllBtn).toBeTruthy()
      expect(language.consentModal?.acceptNecessaryBtn).toBeTruthy()
      expect(language.preferencesModal.sections[0]?.description).toContain(base.policyUrl)
    }
  })
})

it('supports English-default sites, explicit language routes and legacy Japanese defaults', () => {
  expect(validateConsent({...base,defaultLocale:'en'}).defaultLocale).toBe('en')
  expect(()=>validateConsent({...base,defaultLocale:'fr'})).toThrow()
  for (const [path,expected] of [['/','en'],['/contact','en'],['/ja/contact','ja'],['/en/privacy','en'],['/english','en']] as const) expect(consentLanguage(path,'en')).toBe(expected)
  expect(consentLanguage('/contact')).toBe('ja')
  expect(consentLanguage('/en/contact','ja')).toBe('en')
})
