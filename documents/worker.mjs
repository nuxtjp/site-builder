import { contentSignal } from './policy.mjs'

function quality(accept, wanted) {
  let selected = { specificity: -1, q: 0 }
  for (const item of accept.split(',')) {
    const [type, ...parameters] = item.trim().toLowerCase().split(';').map(value => value.trim())
    const specificity = type === wanted ? 2 : type === wanted.split('/')[0] + '/*' ? 1 : type === '*/*' ? 0 : -1
    if (specificity < 0) continue
    const weights = parameters.map(value => value.trim()).filter(value => value.startsWith('q='))
    const weight = weights[0]?.slice(2) ?? '1'
    const q = weights.length > 1 || !/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(weight) ? 0 : Number(weight)
    if (specificity > selected.specificity || specificity === selected.specificity && q > selected.q) selected = { specificity, q }
  }
  return selected.q
}

// The operator supplies a build-bound published route selection. This adapter
// performs no external fetch, collection, authentication or public MCP proxying.
export function createDocumentWorker({ origin, routes }) {
  const canonical = new URL(origin)
  if (canonical.protocol !== 'https:' || canonical.origin !== origin) throw new Error('Canonical HTTPS origin required')
  if (!Array.isArray(routes) || routes.length > 1024) throw new Error('Bounded published routes required')
  const selection = new Map()
  for (const { route, raw } of routes) {
    if (!/^\/(?:[a-z0-9-]+\/?)*$/.test(route) || !/^\/raw\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.md$/.test(raw) || selection.has(route)) throw new Error('Invalid published route')
    selection.set(route, raw)
  }
  return {
    async fetch(request, env) {
      const url = new URL(request.url)
      if (url.origin !== origin) return new Response('Unknown public host', { status: 421 })
      const raw = selection.get(url.pathname)
      if (!raw) return env.ASSETS.fetch(request)
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
      const accept = request.headers.get('accept') || '*/*'
      const markdown = quality(accept, 'text/markdown'), html = quality(accept, 'text/html')
      // Wildcards and equal preferences retain browser HTML. An explicit
      // Markdown preference is required to change the representation.
      const useMarkdown = /(?:^|,)\s*text\/markdown\s*(?:;|,|$)/i.test(accept) && markdown > 0 && markdown >= html
      if (!useMarkdown && html === 0) return new Response('No acceptable representation', { status: 406, headers: { Vary: 'Accept', 'Cache-Control': 'no-store' } })
      const target = new URL(request.url)
      if (useMarkdown) { target.pathname = raw; target.search = '' }
      const headers = new Headers(request.headers)
      // Build timestamps can be shared by different representations. ETags
      // belong to the selected asset; dates must not authorize a false 304.
      headers.delete('if-modified-since')
      // A Range for one representation cannot select bytes in another.
      if (useMarkdown) { headers.delete('range'); headers.delete('if-range') }
      const upstream = await env.ASSETS.fetch(new Request(target, { method: request.method, headers, redirect: 'manual' }))
      if (useMarkdown && (![200, 304].includes(upstream.status) || /text\/html/i.test(upstream.headers.get('content-type') || ''))) return new Response('Published Markdown unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', Vary: 'Accept' } })
      const result = new Headers(upstream.headers)
      result.delete('last-modified')
      const vary = new Set((result.get('vary') || '').split(',').map(value => value.trim()).filter(Boolean))
      if (!vary.has('*') && ![...vary].some(value => value.toLowerCase() === 'accept')) vary.add('Accept')
      result.set('Vary', [...vary].join(', '))
      result.set('Content-Signal', contentSignal)
      result.set('X-Content-Type-Options', 'nosniff')
      const links = [`<${origin}/sitemap.xml>; rel="sitemap"; type="application/xml"`, `<${origin}/llms.txt>; rel="describedby"; type="text/plain"`, `<${origin}${raw}>; rel="alternate"; type="text/markdown"`]
      result.set('Link', links.join(', '))
      if (useMarkdown) { result.set('Content-Type', 'text/markdown; charset=utf-8'); result.set('Content-Location', raw) }
      return new Response(request.method === 'HEAD' || upstream.status === 304 ? null : upstream.body, { status: upstream.status, headers: result })
    }
  }
}
