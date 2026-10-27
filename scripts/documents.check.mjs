import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadSiteDocuments, documentPublicDirectory } from '../documents/index.mjs'
import { parseDocument } from '../documents/source.mjs'
import { encodeDocument } from '../documents/author.mjs'
const meta = { path: '/', title: 'Public product', summary: 'A published guide', kind: 'home', status: 'published' }
const source = value => encodeDocument({ ...value, sections: [{ title: 'Purpose', text: 'Keep {literal} values.', code: 'install example', links: [{ title: 'Guide "one"', href: '/docs', summary: 'Read the guide' }] }] })
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'nuxt-documents-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const facts = { siteId: 'example', origin: 'https://example.test', defaultLocale: 'ja', locales: {} }
  for (const locale of ['ja', 'en']) {
    mkdirSync(join(root, 'documents', locale), { recursive: true })
    facts.locales[locale] = { brand: 'Example', pageOrder: ['/', '/docs'] }
    writeFileSync(join(root, 'documents', locale, 'home.md'), source(meta))
    writeFileSync(join(root, 'documents', locale, 'docs.md'), source({ ...meta, path: '/docs', kind: 'page' }))
  }
  writeFileSync(join(root, 'site.json'), JSON.stringify(facts))
  return pathToFileURL(root + '/')
}
test('official MDC parser preserves literal text, code and registered link data', async () => {
  const doc = await parseDocument(source(meta))
  assert.equal(doc.page.sections[0].text, 'Keep {literal} values.')
  assert.equal(doc.page.sections[0].code, 'install example')
  assert.equal(doc.page.sections[0].links[0].title, 'Guide "one"')
  assert.match(doc.markdown, /Guide "one"/)
  assert.ok(!doc.markdown.includes('::document-link'))
  assert.equal(doc.body.children[0].tag, 'section')
})
test('all public documents generate raw Markdown, locale URLs and a deterministic current snapshot', async t => {
  const root = fixture(t), data = await loadSiteDocuments(root), pub = await documentPublicDirectory(root)
  assert.equal(data.locales.en.pages.length, 2)
  assert.equal(data.locales.ja.pageOrder, undefined)
  assert.match(readFileSync(join(pub, 'raw/en.md'), 'utf8'), /https:\/\/example.test\/en\/docs/)
  assert.match(readFileSync(join(pub, 'llms.txt'), 'utf8'), /\/raw\/en\/docs.md/)
  assert.equal(await loadSiteDocuments(root), data)
  const robots = readFileSync(join(pub, 'robots.txt'), 'utf8')
  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/)
  assert.match(robots, /User-agent: GPTBot\nAllow: \//)
  assert.ok(!robots.includes('Disallow: /'))
  assert.match(robots, /Sitemap: https:\/\/example.test\/sitemap.xml/)
  assert.match(readFileSync(join(pub, '_headers'), 'utf8'), /rel="sitemap"/)
  assert.equal((readFileSync(join(pub, 'sitemap.xml'), 'utf8').match(/<url>/g) || []).length, 4)
})
test('draft bodies are excluded from browser data, raw URLs and the discovery index', async t => {
  const root = fixture(t)
  writeFileSync(new URL('./documents/ja/private.md', root), source({ ...meta, path: '/private', title: 'PRIVATE-NOT-PUBLISHED', status: 'draft' }))
  const data = await loadSiteDocuments(root), pub = await documentPublicDirectory(root)
  assert.ok(!JSON.stringify(data).includes('PRIVATE-NOT-PUBLISHED'))
  assert.ok(!readFileSync(join(pub, 'llms.txt'), 'utf8').includes('PRIVATE-NOT-PUBLISHED'))
  assert.ok(!readFileSync(join(pub, 'sitemap.xml'), 'utf8').includes('/private'))
  const { documentDelivery } = await import('../documents/index.mjs')
  assert.ok(!(await documentDelivery(root)).routes.some(item => item.route === '/private'))
})
test('unregistered public routes, bindings and executable attributes fail before publication', async t => {
  const root = fixture(t)
  writeFileSync(new URL('./documents/ja/extra.md', root), source({ ...meta, path: '/extra' }))
  await assert.rejects(loadSiteDocuments(root), /unregistered/)
  await assert.rejects(parseDocument(source(meta) + '\n{{ process.env.SECRET }}\n'), /registered/)
  await assert.rejects(parseDocument(source(meta) + '\n<script>secret</script>\n'), /raw HTML/)
  await assert.rejects(parseDocument(source(meta).replace('href="/docs"', 'href="javascript:alert(1)"')), /scheme/)
  await assert.rejects(parseDocument(source(meta).replace('title="Guide', ':title="Guide')), /attribute/)
  await assert.rejects(parseDocument(source(meta).replace('href="/docs"', 'href="/docs" style="color:red"')), /attribute/)
  await assert.rejects(parseDocument(source(meta).replace('href="/docs"', 'href="/docs" :style="theme"')), /attribute/)
  await assert.rejects(parseDocument('## Lost body\n\n' + source(meta)), /frontmatter/)
  await assert.rejects(parseDocument(source({ ...meta, documentSections: [] })), /unknown public metadata/)
})
test('localized Markdown links do not rewrite examples inside code fences', async () => {
  const input = source(meta) + '\n[Guide](/docs)\n\n```md\n[Example](/literal)\n```\n'
  const doc = await parseDocument(input, { resolveHref: href => href.startsWith('/') ? 'https://example.test/en' + href : href })
  assert.match(doc.markdown, /\[Guide\]\(https:\/\/example.test\/en\/docs\)/)
  assert.ok(doc.markdown.includes('[Example](/literal)'))
})
test('public JSON resource facts project to catalog Markdown without exposing drafts', async t => {
  const root = fixture(t)
  const facts = JSON.parse(readFileSync(new URL('./site.json', root), 'utf8'))
  facts.locales.en.resources = [{ title: 'Public release', summary: 'Reviewed artifact', href: 'https://example.test/releases/v1', license: 'MIT' }]
  writeFileSync(new URL('./site.json', root), JSON.stringify(facts))
  writeFileSync(new URL('./documents/en/home.md', root), source({ ...meta, kind: 'catalog' }))
  await loadSiteDocuments(root)
  const markdown = readFileSync(join(await documentPublicDirectory(root), 'raw/en.md'), 'utf8')
  assert.match(markdown, /\[Public release\]\(https:\/\/example.test\/releases\/v1\).*Reviewed artifact.*MIT/)
})
test('validated JSON facts also generate native Markdown/MDC for default site consumers', async t => {
  const { materializeDefaultDocuments } = await import('../documents/default.mjs')
  const { loadSiteConfig } = await import('../validator/content/index.js')
  const root = mkdtempSync(join(tmpdir(), 'nuxt-default-documents-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const config = loadSiteConfig(new URL('../examples/content', import.meta.url).pathname)
  const result = await materializeDefaultDocuments(config, root)
  const index = readFileSync(join(result.publicDirectory, 'llms.txt'), 'utf8')
  assert.equal(index.split('\n').filter(line => line.startsWith('- [')).length, 8)
  assert.ok(readFileSync(join(root, 'documents/ja/index.md'), 'utf8').includes('::document-link'))
  assert.ok(readFileSync(result.components, 'utf8').includes('ja:/docs'))
  assert.match(readFileSync(join(result.publicDirectory, 'raw/en.md'), 'utf8'), /Canonical: https:\/\/example.test\/en\n$/)
})

test('default consumers retain validated HTTP origins, ports and base paths', async t => {
  const root = fixture(t)
  const facts = JSON.parse(readFileSync(new URL('./site.json', root), 'utf8'))
  facts.origin = 'http://127.0.0.1:8080/product'
  writeFileSync(new URL('./site.json', root), JSON.stringify(facts))
  await loadSiteDocuments(root)
  const markdown = readFileSync(join(await documentPublicDirectory(root), 'raw/en.md'), 'utf8')
  assert.match(markdown, /http:\/\/127.0.0.1:8080\/product\/en\/docs/)
})

test('heading IDs are independent of previously parsed documents', async () => {
  const first = await parseDocument(source(meta))
  await parseDocument(source({ ...meta, path: '/unrelated' }))
  const again = await parseDocument(source(meta))
  assert.deepEqual(again.body, first.body)
})
