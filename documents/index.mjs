import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, mkdirSync, writeFileSync, lstatSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { parseDocument, escapeMarkdown, publicHref } from './source.mjs'
import { writeDiscoveryAssets } from './discovery.mjs'
const cache = new Map()
const hash = value => createHash('sha256').update(value).digest('hex')
function regular(path) { assert.ok(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), 'regular document source required') }
function files(directory, prefix = '') {
  assert.ok(!lstatSync(directory).isSymbolicLink(), 'document directory symlinks refused')
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    assert.ok(!entry.isSymbolicLink(), 'document symlinks refused')
    const path = join(directory, entry.name), relative = prefix + entry.name
    return entry.isDirectory() ? files(path, relative + '/') : entry.name.endsWith('.md') ? [{ path, relative }] : []
  })
}
export async function loadSiteDocuments(root) {
  const directory = root instanceof URL ? fileURLToPath(root) : root
  regular(join(directory, 'site.json'))
  const factsText = readFileSync(join(directory, 'site.json'), 'utf8')
  const selected = files(join(directory, 'documents'))
  assert.ok(selected.length > 0 && selected.length <= 1024, 'document count limit exceeded')
  let total = factsText.length
  const sources = selected.map(file => {
    regular(file.path)
    assert.ok(lstatSync(file.path).size <= 131072, 'document byte limit exceeded')
    const source = readFileSync(file.path, 'utf8'); total += Buffer.byteLength(source)
    assert.ok(total <= 16 * 1024 * 1024, 'document collection byte limit exceeded')
    return { ...file, source }
  })
  const digest = hash(factsText + sources.map(file => file.relative + '\0' + file.source).join('\0'))
  if (cache.get(directory)?.digest === digest) return cache.get(directory).data
  const data = JSON.parse(factsText), generated = join(directory, '.generated-documents')
  assert.ok(Object.keys(data).every(key => ['siteId', 'origin', 'defaultLocale', 'prefixDefaultLocale', 'localeRootTrailingSlash', 'locales'].includes(key)), 'unknown site metadata')
  assert.ok(Object.keys(data.locales).every(key => ['ja', 'en'].includes(key)), 'unknown locale')
  for (const locale of Object.values(data.locales)) {
    assert.ok(Object.keys(locale).every(key => ['brand', 'caption', 'origin', 'locale', 'accent', 'icon', 'navigation', 'secondaryAction', 'resources', 'pageOrder'].includes(key)), 'unknown locale metadata')
  }
  const origin = new URL(data.origin)
  assert.ok(['http:', 'https:'].includes(origin.protocol) && !origin.username && !origin.password && !origin.search && !origin.hash, 'invalid public origin')
  data.origin = data.origin.replace(/\/+$/, '')
  assert.ok(['ja', 'en'].includes(data.defaultLocale))
  mkdirSync(generated, { recursive: true })
  assert.ok(!lstatSync(generated).isSymbolicLink(), 'generated output symlink refused')
  const output = join(generated, digest), publicDirectory = join(output, 'public')
  mkdirSync(publicDirectory, { recursive: true })
  const components = [], index = [], docs = new Map(), markdowns = []
  for (const file of sources) {
    const locale = file.relative.split('/')[0]
    assert.ok(['ja', 'en'].includes(locale), 'document locale required')
    const prefix = !data.prefixDefaultLocale && locale === data.defaultLocale ? '' : '/' + locale
    const local = href => href.startsWith('/') ? prefix + (href === '/' && prefix && data.localeRootTrailingSlash === false ? '' : href) : href
    const doc = await parseDocument(file.source, { resolveHref: href => href.startsWith('/') ? data.origin + local(href) : href })
    if (doc.page.status === 'draft') continue
    const key = `${locale}:${doc.page.path}`
    assert.ok(!docs.has(key), 'duplicate document identity')
    docs.set(key, doc.page)
    const route = local(doc.page.path)
    const raw = '/raw' + (route === '/' ? '/index' : route.replace(/\/$/, '')) + '.md'
    const component = `document-${components.length}.mjs`
    writeFileSync(join(output, component), `import { h } from 'vue'
import Renderer from '@nuxtjs/mdc/runtime/components/MDCRenderer.vue'
const body = ${JSON.stringify(doc.body)}
export default function Document(props) { return h(Renderer, {body, data:{}, prose:false, components:{'document-link':props.components?.DocumentLink}}) }
`)
    components.push({ key, component })
    const destination = join(publicDirectory, raw)
    markdowns.push({ destination, locale, route, raw, doc, local })
    index.push(`- [${escapeMarkdown(doc.page.label || doc.page.title.replace(/\n/g, ' '))}](${data.origin}${raw}): ${escapeMarkdown(doc.page.summary)}`)
  }
  const wanted = new Set()
  for (const locale of ['ja', 'en']) {
    const order = data.locales[locale].pageOrder
    assert.ok(Array.isArray(order) && new Set(order).size === order.length, 'explicit unique publication order required')
    data.locales[locale].pages = order.map(path => {
      const key = `${locale}:${path}`; wanted.add(key)
      assert.ok(docs.has(key), 'publication references a missing or draft document')
      return docs.get(key)
    })
    delete data.locales[locale].pageOrder
  }
  assert.equal(wanted.size, docs.size, 'unregistered public document refused')
  for (const { destination, locale, route, doc, local } of markdowns) {
    const pages = data.locales[locale].pages
    const links = doc.page.kind === 'catalog' ? data.locales[locale].resources || []
      : doc.page.kind === 'journal' ? pages.filter(page => page.kind === 'article').map(page => ({ title: page.title, summary: page.summary, href: page.path }))
      : doc.page.path === '/sitemap' ? pages.filter(page => page.path !== '/sitemap').map(page => ({ title: page.label || page.title, href: page.path })) : []
    const projection = links.length ? '\n\n## ' + (locale === 'ja' ? '関連する公開情報' : 'Related public information') + '\n\n' + links.map(link => {
      publicHref(link.href)
      const href = publicHref(link.href.startsWith('/') ? data.origin + local(link.href) : link.href, true)
      return `- [${escapeMarkdown(link.title.replace(/\n/g, ' '))}](${href})${link.summary ? ' — ' + escapeMarkdown(link.summary) : ''}${link.license ? ' (' + escapeMarkdown(link.license) + ')' : ''}`
    }).join('\n') : ''
    mkdirSync(destination.slice(0, destination.lastIndexOf('/')), { recursive: true })
    writeFileSync(destination, `# ${escapeMarkdown(doc.page.title.replace(/\n/g, ' '))}\n\n${escapeMarkdown(doc.page.summary)}\n\n${doc.markdown}${projection}\n\nCanonical: ${data.origin}${route}\n`)
  }
  writeFileSync(join(publicDirectory, 'llms.txt'), `# ${data.locales[data.defaultLocale].brand}\n\n${index.join('\n')}\n`)
  writeDiscoveryAssets(publicDirectory, data.origin, markdowns)
  writeFileSync(join(output, 'delivery.json'), JSON.stringify({ origin: data.origin, routes: markdowns.map(({ route, raw }) => ({ route, raw })) }) + '\n')
  writeFileSync(join(generated, 'content.json'), JSON.stringify(data) + '\n')
  writeFileSync(join(generated, 'components.mjs'), components.map((item, i) => `import D${i} from './${digest}/${item.component}'`).join('\n') + '\nexport default {' + components.map((item, i) => `${JSON.stringify(item.key)}: D${i}`).join(',') + '}\n')
  writeFileSync(join(generated, 'components.d.mts'), "import type { FunctionalComponent } from 'vue'\ndeclare const components: Record<string, FunctionalComponent>\nexport default components\n")
  writeFileSync(join(generated, 'public-directory.json'), JSON.stringify(publicDirectory))
  cache.set(directory, { digest, data })
  return data
}
export async function documentPublicDirectory(root) {
  await loadSiteDocuments(root)
  return JSON.parse(readFileSync(new URL('./.generated-documents/public-directory.json', root), 'utf8'))
}
export async function documentDelivery(root) {
  const directory = await documentPublicDirectory(root)
  return JSON.parse(readFileSync(join(directory, '..', 'delivery.json'), 'utf8'))
}
