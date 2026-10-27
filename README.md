# @nuxtjp/localized-site

[日本語](README.ja.md)

Generate a Japanese/English introduction site from one validated configuration. The module supplies `/`, `/docs`, `/docs/getting-started`, `/docs/security` and their English counterparts, locale links and SEO metadata.

## Install and configure

Install the published version identified by `npm view @nuxtjp/localized-site version`. Use Nuxt `^4.6.2`, Vue `^3.5.40`, and Node.js 22.19+ or 24.11+.

```sh
pnpm add @nuxtjp/localized-site nuxt vue
```

```ts
export default defineNuxtConfig({
  modules: [['@nuxtjp/localized-site', { contentRoot: '.' }]]
})
```

Set `contentRoot` explicitly. Copy the [generic configuration](examples/content/site.config.json) there as `site.config.json`, and replace it with the site's own content.
The configuration requires `siteId`, `serviceId`, `origin`, `audienceScope`, complete ja/en content, exactly three features, getting-started and security documents, privacy/contact notices, and `externalActions: false`.

```sh
pnpm exec nuxtjp-localized-site validate --content-root .
pnpm exec nuxt build
```

## Behavior and limits

Privacy/contact notices are text. The module creates no unset links or actions.
In the browser, the optional maintenance notice reads same-origin `/maintenance.json`. Failed retrieval, invalid data or expired data hides that notice; the site and locale switching remain usable.
For archive testing, install the exact reviewed TGZ instead of the registry version. These commands do not publish a website or configure registry access.

## Typed messages

```ts
const messages = defineLocalizedMessages({
  ja: { save: '保存', cancel: 'キャンセル' },
  en: { save: 'Save', cancel: 'Cancel' }
})
const { t } = useLocalizedMessages(messages)
t('save')
```

English keys must match Japanese keys. Empty messages fall back to `fallbackLocale`, then `defaultLocale`.

## Development

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm validate:example
pnpm pack
```

`prepack` runs tests, typecheck, build and example validation. Verify the actual archive in a separate host before a release.

## Documentation and license

The [public document and sem-lang integration policy](docs/agent-readable-documents.ja.md)
defines ownership and acceptance. The 0.4.0 source candidate implements native MDC,
static Markdown and llms.txt; see [editing and generation](docs/markdown-mdc.ja.md).
See [AI-first discovery and acceptance](docs/agent-readiness.ja.md) for generated
robots.txt, explicit permission for search/AI input/training, sitemap/Link headers,
and the optional published-route ASSETS delivery adapter. Hosting acceptance is separate.
Its formal registry release and consumer dependency updates are still required;
semantic integration remains a separate acceptance step.

[Usage guide](https://github.com/nuxtjp/site-builder/blob/main/docs/getting-started.md) · [Schema](schemas/localized-site-v1.schema.json) · [Tests](https://github.com/nuxtjp/site-builder/tree/main/test) · [Security reporting](https://github.com/nuxtjp/site-builder/blob/main/SECURITY.md)

Code: [Apache-2.0](LICENSE). [LICENSE-PREVIOUS](LICENSE-PREVIOUS) retains prior grants, and [NOTICE](NOTICE) preserves attribution.
[LICENSE-ASSETS](LICENSE-ASSETS) retains separate terms for covered brand/content assets. It does not change the code license or grant rights to third-party or site-owned content.

## Consumer dependency security

See [dependency security backports](security/README.md) before installing this package in a Nuxt application. pnpm consumers must explicitly apply the included backports and verify their locked dependency tree; ordinary npm installation does not apply them.

## Public showcase / OSS紹介

[Dashboard, product LP, public feed and owner operations](docs/public-showcase.md) — opt-in public showcase support.

## Organization showcase

Place a reviewed `nuxtjp://showcase/v1` public snapshot at the content root's `public/oss/showcase.json` to add localized `/oss` and `/oss/<entry-id>` pages. Reuse the existing validator, component and bounded registry collector. Pages never access provider accounts or registries; unavailable/stale values remain distinct from zero, and feedback links point to public owner source issues.

Snapshots must be regular, bounded files without symlinks; route conflicts are rejected. The organization preset disables an absent maintenance endpoint rather than inventing health. General consumers retain the previous default and may explicitly use `maintenance: false`.

[OSS responsibility and source completion](docs/oss-source-contract.md) defines the supported package boundary and required acceptance. It does not declare unexecuted source, distribution or production checks complete.

Dependency updates: [repository policy](docs/dependency-updates.md).
Registry releases: [version tags and GitHub OIDC](docs/registry-release.md).


## Declarative consent module

Consent UI and storage use `vanilla-cookieconsent` 3.1.0 (MIT, no transitive
runtime dependencies). This package supplies a strict Nuxt adapter, localized
controls and consent-gated script loading; it is not a legal compliance certificate.
Enable via the localized-site module's `consent` option, or independently through
`@nuxtjp/localized-site/consent` with the same options:

```ts
consent: {
  schemaVersion: 1,
  policyUrl: 'https://hat-tech.co.jp/privacy',
  policyRevision: 'your-reviewed-policy-revision',
  services: []
}
```

`schemas/consent-v1.schema.json` defines public data. The runtime validator also
rejects duplicate IDs/resources, unsafe URL schemes, executable labels and
unknown keys. Each optional service declares `id`, `label`, `purpose`, `category`
(`functional`, `analytics`, `marketing`), HTTPS `scripts` (`src`, optional SRI
`integrity`) and exact first-party root-path `cookies` to clear on withdrawal.
No service may declare itself necessary. Do not list authentication cookies for
optional cleanup. Parent-domain/custom-path, HttpOnly and third-party cookies
need provider-side cleanup and are not handled by this adapter.

With no optional services, no automatic banner or stored choice is created;
a persistent Privacy settings control still explains essential operation and
links the common policy. Optional scripts make no preload, connection hint or
script request before consent. All optional categories start disabled; accept,
reject and individual choices remain available. Choices are saved in origin-local
storage for 180 days, equally for acceptance and refusal. CookieConsent includes
a local consent ID and timestamps; this module never transmits them or shares
choices between origins. Changing the definition/policy revision changes its
build-time digest and invalidates previous consent. This does not constitute a
server-side legal consent log. Policy acknowledgment and form processing remain
separate from optional tracking choices.

Withdrawal clears declared accessible cookies and reloads the document after
saving the refusal, stopping already-running script timers/listeners. Data
already sent cannot be recalled. Browser storage failure must not enable scripts.
External `app.head` scripts and optional preconnect hints fail the build: declare
resources here instead. This does not intercept scripts started by other modules,
HTML injected at the CDN, images, fonts, fetch calls or arbitrary third-party
iframes. Audit those paths separately; Cloudflare automatic RUM injection must
be managed at the provider. Do not mark an unobserved provider setting as disabled.
No blanket CookieConsent/Turnstile exemption or GDPR applicability is inferred.

Run `pnpm test:consent:browser` after building the module. It exercises no-send
before choice, rejection persistence, individual choices, withdrawal and cleanup,
stale revision, both languages and necessary-only operation using synthetic
tracking endpoints; it never calls a real analytics provider.

Consent definitions may set `defaultLocale: "en"` for English-default sites. Explicit `/ja` and `/en` URL prefixes override it; omitting the field preserves the Japanese default.


Version 0.5.0 adds `NuxtJpServiceSite`: route adapters declare data
and named component slots while the module owns shared presentation and CSS.
`@nuxtjp/localized-site/declarative` validates CSS-free page adapters before builds.
Product-specific behavior and scoped component styles stay with their owner.
See [the document and presentation contract](docs/markdown-mdc.ja.md).
