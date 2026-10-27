import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { encodeDocument } from './author.mjs'
import { loadSiteDocuments, documentPublicDirectory } from './index.mjs'

// The validated public JSON contract remains data, not a second handwritten body.
// Default consumers get the same MDC AST and plain Markdown path as custom sites.
export async function materializeDefaultDocuments(config, directory) {
  const facts = { siteId: config.siteId, origin: config.origin, defaultLocale: config.defaultLocale, prefixDefaultLocale: config.prefixDefaultLocale, localeRootTrailingSlash: false, locales: {} }
  for (const locale of config.locales) {
    const content = config.content[locale]
    const pages = [{ path: '/', title: content.brand, summary: content.tagline + '\n\n' + content.summary,
      kind: 'home', status: 'published', sections: content.features.map(feature => ({ title: feature.title, text: feature.summary })) }]
    pages[0].sections.push({ title: content.docs.overview.title, text: content.docs.overview.summary,
      links: Object.values(content.docs).map(doc => ({ title: doc.title, href: doc.slug, summary: doc.summary })) })
    for (const doc of Object.values(content.docs)) pages.push({ path: doc.slug, title: doc.title, summary: doc.summary,
      kind: 'page', status: 'published', sections: doc.sections.map(section => ({ title: section.title, text: section.body.join('\n\n') })) })
    facts.locales[locale] = { brand: content.brand, pageOrder: pages.map(page => page.path) }
    const target = join(directory, 'documents', locale)
    mkdirSync(target, { recursive: true })
    for (const page of pages) writeFileSync(join(target, (page.path === '/' ? 'index' : page.path.slice(1).replaceAll('/', '--')) + '.md'), encodeDocument(page))
  }
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'site.json'), JSON.stringify(facts))
  const root = pathToFileURL(directory + '/')
  await loadSiteDocuments(root)
  return { components: join(directory, '.generated-documents/components.mjs'), publicDirectory: await documentPublicDirectory(root) }
}
