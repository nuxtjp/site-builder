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

[Usage guide](https://github.com/nuxtjp/site-builder/blob/main/docs/getting-started.md) · [Schema](schemas/localized-site-v1.schema.json) · [Tests](https://github.com/nuxtjp/site-builder/tree/main/test) · [Security reporting](https://github.com/nuxtjp/site-builder/blob/main/SECURITY.md)

Code: [Apache-2.0](LICENSE). [LICENSE-PREVIOUS](LICENSE-PREVIOUS) retains prior grants, and [NOTICE](NOTICE) preserves attribution.
[LICENSE-ASSETS](LICENSE-ASSETS) retains separate terms for covered brand/content assets. It does not change the code license or grant rights to third-party or site-owned content.

## Consumer dependency security

See [dependency security backports](security/README.md) before installing this package in a Nuxt application. pnpm consumers must explicitly apply the included backports and verify their locked dependency tree; ordinary npm installation does not apply them.

## Public showcase / OSS紹介

[Dashboard, product LP, public feed and owner operations](docs/public-showcase.md) — opt-in 0.2.0 candidate; staged owner approval is still required.

## Organization showcase candidate (0.2.2)

Place a reviewed `nuxtjp://showcase/v1` public snapshot at the content root's `public/oss/showcase.json` to add localized `/oss` and `/oss/<entry-id>` pages. Reuse the existing validator, component and bounded registry collector. Pages never access provider accounts or registries; unavailable/stale values remain distinct from zero, and feedback links point to public owner source issues.

Snapshots must be regular, bounded files without symlinks; route conflicts are rejected. The organization preset disables an absent maintenance endpoint rather than inventing health. General consumers retain the previous default and may explicitly use `maintenance: false`. Version 0.2.2 is a pre-publication candidate, pending reviewed hash and consumer acceptance.

[OSS responsibility and source completion](docs/oss-source-contract.md) defines the supported package boundary and required acceptance. It does not declare unexecuted source, distribution or production checks complete.

Dependency updates: [repository policy](docs/dependency-updates.md).
Registry releases: [version tags and GitHub OIDC](docs/registry-release.md).
