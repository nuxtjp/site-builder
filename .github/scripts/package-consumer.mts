import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync, spawn } from 'node:child_process'
import { createServer } from 'node:net'

const archive = resolve(process.argv[2])
const editorial = process.env.EDITORIAL_TEST_MODE
assert.ok(!editorial || ['portfolio', 'organization', 'product'].includes(editorial))
const root = mkdtempSync(join(tmpdir(), 'localized-site-consumer-'))
const env = { ...process.env, NPM_CONFIG_CACHE: join(root, 'empty-cache'), CI: 'true', NUXT_TELEMETRY_DISABLED: '1' }
for (const key of ['NPM_TOKEN', 'NODE_AUTH_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN']) delete env[key]
writeFileSync(join(root, '.npmrc'), '')
env.NPM_CONFIG_USERCONFIG = join(root, '.npmrc')
writeFileSync(join(root, 'package.json'), JSON.stringify({
  private: true, type: 'module', dependencies: { '@nuxtjp/localized-site': `file:${archive}`, nuxt: '4.6.2', vue: '3.5.44' },
  devDependencies: { typescript: '5.9.3', 'vue-tsc': '3.2.8' }
}, null, 2))
function run(command, args) {
  const p = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', timeout: 600_000 })
  assert.equal(p.status, 0, `${command}: ${p.stdout?.slice(-5000)} ${p.stderr?.slice(-5000)}`)
}
run('npm', ['install', '--registry=https://registry.npmjs.org', '--no-audit', '--no-fund'])
copyFileSync(join(root, 'node_modules/@nuxtjp/localized-site/examples/content/site.config.json'), join(root, 'site.config.json'))
const presentation = editorial ? `, presentation: {theme:'${editorial === 'portfolio' ? 'coela' : 'nuxtjp'}', scope:'${editorial}'}` : ''
writeFileSync(join(root, 'nuxt.config.ts'), `export default defineNuxtConfig({ modules: [['@nuxtjp/localized-site', { contentRoot: '.', consent: {schemaVersion:1,policyUrl:'https://hat-tech.co.jp/privacy',policyRevision:'consumer-fixture-v1',services:[]} ${presentation} }]], devtools: { enabled: false }, nitro: { prerender: { ignore: ['/'] } } })`)
if (editorial) {
  const snapshot = JSON.parse(readFileSync(new URL('../../playground/data/showcase.json', import.meta.url)))
  snapshot.observedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  for (const entry of snapshot.entries) for (const metric of entry.metrics) metric.observedAt = snapshot.observedAt
  mkdirSync(join(root, 'public/oss'), { recursive: true })
  writeFileSync(join(root, 'public/oss/showcase.json'), JSON.stringify(snapshot))
  const entry = { ...snapshot.entries.find(entry => entry.kind === 'product'), id: 'example-site' }
  writeFileSync(join(root, 'public/oss/organizations.json'), JSON.stringify({ ...snapshot, entries: [entry] }))
  if (editorial === 'product') for (const name of ['showcase.json', 'organizations.json']) writeFileSync(join(root, 'public/oss', name), 'unused invalid OSS feed')
}
writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ extends: './.nuxt/tsconfig.json' }))
writeFileSync(join(root, 'smoke.mjs'), `
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import consentModule from '@nuxtjp/localized-site/consent'
assert.equal(typeof consentModule, 'function')
import { localePath, siteRoutes, maintenanceForService } from '@nuxtjp/localized-site/core'
import { validateSiteConfig } from '@nuxtjp/localized-site/validator'
import { validateShowcaseFeed, summarizeDownloads } from '@nuxtjp/localized-site/showcase'
import { collectDownloads } from '@nuxtjp/localized-site/showcase/collectors'
const showcase = validateShowcaseFeed(JSON.parse(readFileSync('app/data/showcase.json', 'utf8')))
assert.equal(summarizeDownloads(showcase, Date.parse(showcase.observedAt))[0].downloads, 1234)
const period = { start: '2026-10-01', end: '2026-10-02' }
const metric = await collectDownloads('npm', '@example/parser', period, { now: Date.parse('2026-10-03T00:00:00Z'), fetchImplementation: async () => new Response(JSON.stringify({ package: '@example/parser', ...period, downloads: 42 })) })
assert.equal(metric.downloads, 42)
const config = validateSiteConfig(JSON.parse(readFileSync('site.config.json', 'utf8')))
assert.equal(siteRoutes(config).length, 8)
assert.equal(localePath('/docs?q=sample#main-content', 'en', config), '/en/docs?q=sample#main-content')
assert.equal(maintenanceForService({}, 'sample-service'), null)
`)
if (!editorial) cpSync(new URL('../../playground/pages', import.meta.url), join(root, 'app/pages'), { recursive: true })
cpSync(new URL('../../playground/data', import.meta.url), join(root, 'app/data'), { recursive: true })
writeFileSync(join(root, 'app/app.vue'), '<template><NuxtLayout><NuxtPage /></NuxtLayout></template>')
run('node', ['smoke.mjs'])
run('node', ['node_modules/@nuxtjp/localized-site/bin/nuxtjp-localized-site.mjs', 'validate', '--content-root', '.'])
run('node', ['node_modules/nuxt/bin/nuxt.mjs', 'prepare'])
run('node', ['node_modules/nuxt/bin/nuxt.mjs', 'typecheck'])
run('node', ['node_modules/nuxt/bin/nuxt.mjs', 'build'])
const port = await new Promise(done => {
  const socket = createServer().listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => done(port)) })
})
const server = spawn('node', ['.output/server/index.mjs'], { cwd: root, env: { ...env, NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] })
let serverOutput = ''
let spawnFailure: string | null = null
for (const stream of [server.stdout, server.stderr]) stream?.on('data', chunk => { serverOutput = (serverOutput + String(chunk)).slice(-4096) })
server.on('error', error => { spawnFailure = error.message })
try {
  const base = `http://127.0.0.1:${port}`
  let ready = false
  let lastStatus: number | null = null
  for (let i = 0; i < 40; i++) {
    if (spawnFailure || server.exitCode !== null || server.signalCode !== null) throw Error(`Fixture server exited before readiness: ${spawnFailure ?? server.exitCode ?? server.signalCode}; ${serverOutput}`)
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(750) })
      lastStatus = response.status; await response.body?.cancel()
      if (response.ok) { ready = true; break }
    } catch {}
    await new Promise(done => setTimeout(done, 250))
  }
  assert.ok(ready, `Fixture server not ready; HTTP=${lastStatus}, exit=${server.exitCode}, output=${serverOutput}`)
  for (const locale of ['ja', 'en']) {
    for (const path of ['/', '/docs', '/docs/getting-started', '/docs/security']) {
      const route = locale === 'ja' ? path : `/en${path === '/' ? '' : path}`
      const response = await fetch(base + route)
      assert.equal(response.status, 200)
      const html = await response.text()
      assert.ok(html.includes(`lang="${locale}"`))
      assert.ok(html.includes('rel="canonical"'))
      assert.ok(html.includes('hreflang="ja"') && html.includes('hreflang="en"'))
      assert.ok(html.includes(locale === 'ja' ? 'サンプルサービス' : 'Sample Service'))
      assert.ok(html.includes('type="text/markdown"'))
      const markdown = await fetch(base + '/raw' + (route === '/' ? '/index' : route) + '.md')
      assert.equal(markdown.status, 200)
      assert.match(markdown.headers.get('content-type') ?? '', /^text\/markdown\b/)
      const body = await markdown.text()
      const content = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).content[locale]
      const expected = path === '/' ? { title: content.brand, sections: [] } : Object.values(content.docs).find((doc: any) => doc.slug === path) as any
      assert.ok(body.includes(expected.title))
      for (const section of expected.sections) for (const paragraph of section.body) assert.ok(body.includes(paragraph))
      assert.ok(!body.includes('::document-link') && !body.startsWith('---'))
      assert.ok(body.includes(`Canonical: https://example.test${route}\n`))
      assert.ok(!/<a[^>]*href="(?:#|mailto:|tel:|javascript:|undefined|)"/.test(html))
    }
  }
  assert.equal((await fetch(base + '/missing-page')).status, 404)
  const llms = await fetch(base + '/llms.txt')
  assert.equal(llms.status, 200)
  assert.equal((await llms.text()).split('\n').filter(line => line.startsWith('- [')).length, 8)
  if (editorial === 'product') for (const prefix of ['', '/en']) assert.equal((await fetch(base + prefix + '/oss')).status, 404)
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  for (const [name, item] of Object.entries(lock.packages)) {
    if (name && name !== 'node_modules/@nuxtjp/localized-site' && item.resolved) assert.ok(item.resolved.startsWith('https://registry.npmjs.org/'))
  }
  if (!editorial) run('node', [new URL('./showcase-browser.mjs', import.meta.url).pathname, base])
  if (editorial) run('node', [new URL('./editorial-browser.mjs', import.meta.url).pathname, base, editorial])
  if (process.argv[3]) run('node', [resolve(process.argv[3]), root, base])
  console.log(JSON.stringify({ root, result: 'pass', actual_archive: archive, public_dependencies: true, routes_SSR: 8, unset_links: true, CLI: true, core_validator_import: true, typecheck: true, build: true }))
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = new Promise<void>(done => server.once('exit', () => done()))
    server.kill('SIGTERM')
    const timer = setTimeout(() => { if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL') }, 2000)
    timer.unref()
    try { await exited } finally { clearTimeout(timer) }
  }
}
