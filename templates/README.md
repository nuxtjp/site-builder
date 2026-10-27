# Independent service-site scaffold

`service-site` is an Apache-2.0 source template, not a second runtime package.
Copy it into a site's `site` directory and add reviewed bilingual `documents/{ja,en}/**/*.md`
and `site.json` publication metadata. Register `site/module.ts` after the published localized-site
module and branding module. Keep the site's own LICENSE/NOTICE and brand rights.
The consuming repository owns subsequent customization and versioned releases.
It has no runtime dependency on this checkout or the portfolio manager.

For a one-time copy, run `node templates/adopt.mjs NEW_DIRECTORY REVIEWED_DOCUMENT_DIRECTORY`.
It compiles the current MDC input and validates the public document graph and refuses to overwrite an existing owner directory.
Include LICENSE/NOTICE; later updates are reviewed owner changes, not generated
overwrites. This command does not edit Nuxt configuration or install packages.

The scaffold provides a purpose-led home, capability/use-case pages, categorized
resource search, journal and article pages, bilingual navigation, sticky/mobile
header, canonical language links, and HTML/XML sitemaps. Keep unpublished prompts
outside the imported manifest. Only reviewed published pages enter the bundle.
`node site/check.mjs` validates translation coverage, unique paths and every local
link before build. Add it to the owner's test command; the module also validates
before Nuxt generates pages. Real article content is added by the site owner.

References: [Linear](https://linear.app/), [Vercel](https://vercel.com/) and
[Supabase](https://supabase.com/). Adopt visitor-goal navigation and progressive
detail, not their copy, customer claims, proprietary graphics or brand styling.
Existing owner icons and explicit brand colors remain the visual foundation.

Deploy separately. No scaffold command creates a version tag, calls a provider,
installs credentials or claims product availability. Keep release, signature and
first-run acceptance in their existing owner workflows.

The former content.json authoring input and PageSections renderer have been removed.
MDC is parsed and rendered with the official Nuxt MDC implementation; the same selected
source produces standard Markdown and llms.txt. Generated .generated-documents
files are build artifacts and must be ignored by Git. The documents subpath is a
new source-candidate API and requires its separately verified package release.
