import test from 'node:test'
import assert from 'node:assert/strict'
import { createDocumentWorker } from '../documents/worker.mjs'

const origin = 'https://example.test'
const worker = createDocumentWorker({ origin, routes: [{ route: '/', raw: '/raw/index.md' }, { route: '/en/', raw: '/raw/en.md' }] })
const env = { ASSETS: { async fetch(request) {
  const md = new URL(request.url).pathname.startsWith('/raw/')
  const etag = md ? '"markdown"' : '"html"'
  const unchanged = request.headers.get('if-none-match') === etag
  return new Response(unchanged || request.method === 'HEAD' ? null : md ? '# Public guide' : '<h1>Public guide</h1>', { status: unchanged ? 304 : 200, headers: { ETag: etag, Vary: 'Origin', 'Content-Type': md ? 'text/markdown' : 'text/html' } })
} } }
const read = (accept, options = {}) => worker.fetch(new Request(origin + '/', { ...options, headers: { accept, ...options.headers } }), env)

test('HTML and Markdown negotiate quality and preserve representation-specific validators', async () => {
  for (const accept of ['*/*', 'text/html', 'text/*', 'text/markdown;q=0, text/html', 'text/markdown;q=0.5, text/html;q=1']) {
    const result = await read(accept)
    assert.equal(await result.text(), '<h1>Public guide</h1>', accept)
    assert.equal(result.headers.get('etag'), '"html"')
    assert.equal(result.headers.get('vary'), 'Origin, Accept')
  }
  for (const accept of ['text/markdown', 'text/markdown;q=1, text/html;q=0.5', 'text/markdown, */*', 'text/markdown ; q=1']) {
    const result = await read(accept)
    assert.equal(await result.text(), '# Public guide', accept)
    assert.match(result.headers.get('content-type'), /^text\/markdown/)
    assert.equal(result.headers.get('etag'), '"markdown"')
    assert.match(result.headers.get('link'), /rel="alternate"/)
  }
  for (const accept of ['application/json', 'text/markdown;q=0, text/html;q=0', 'text/markdown;q=bogus']) assert.equal((await read(accept)).status, 406)
  const head = await read('text/markdown', { method: 'HEAD' })
  assert.equal(await head.text(), '')
  assert.equal(head.headers.get('etag'), '"markdown"')
  assert.equal((await read('text/markdown', { headers: { 'if-none-match': '"html"' } })).status, 200)
  const unchanged = await read('text/markdown', { headers: { 'if-none-match': '"markdown"' } })
  assert.equal(unchanged.status, 304)
  assert.equal(await unchanged.text(), '')
  let datesForwarded = true
  const dated = await worker.fetch(new Request(origin + '/', { headers: { accept: 'text/markdown', 'if-modified-since': 'Wed, 28 Oct 2026 00:00:00 GMT' } }), { ASSETS: { async fetch(request) {
    datesForwarded = request.headers.has('if-modified-since')
    return new Response('# Public guide', { headers: { 'Content-Type': 'text/markdown', 'Last-Modified': 'Wed, 28 Oct 2026 00:00:00 GMT' } })
  } } })
  assert.equal(datesForwarded, false)
  assert.equal(dated.headers.has('last-modified'), false)
})

test('only published page reads negotiate; private/status paths and mutations stay with their owner', async () => {
  const calls = []
  const assets = { ASSETS: { async fetch(request) { calls.push(request.url); return new Response('owner response', { status: 404 }) } } }
  assert.equal((await worker.fetch(new Request(origin + '/private', { headers: { accept: 'text/markdown' } }), assets)).status, 404)
  assert.equal(calls[0], origin + '/private')
  assert.equal((await read('text/markdown', { method: 'POST' })).status, 405)
  assert.equal((await worker.fetch(new Request('https://other.test/'), assets)).status, 421)
  assert.equal((await worker.fetch(new Request(origin + '/', { headers: { accept: 'text/markdown' } }), assets)).status, 503)
  assert.throws(() => createDocumentWorker({ origin, routes: [{ route: '/../private', raw: '/raw/private.md' }] }))
})
