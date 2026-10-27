import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { contentSignal } from './policy.mjs'
const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'CCBot']
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')

// Only routes selected for both HTML and Markdown are discoverable. robots.txt
// expresses usage preferences; it is never an access-control boundary.
export function writeDiscoveryAssets(directory, origin, routes) {
  writeFileSync(join(directory, 'robots.txt'), `# Public search, answer retrieval and model training are allowed.\nUser-agent: *\nAllow: /\nContent-Signal: ${contentSignal}\n\n${aiBots.map(bot => `User-agent: ${bot}\nAllow: /\nContent-Signal: ${contentSignal}\n`).join('\n')}\nSitemap: ${origin}/sitemap.xml\n`)
  writeFileSync(join(directory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(({ route }) => `<url><loc>${xml(origin + route)}</loc></url>`).join('')}</urlset>\n`)
  const discovery = `<${origin}/sitemap.xml>; rel="sitemap"; type="application/xml", <${origin}/llms.txt>; rel="describedby"; type="text/plain"`
  // Keep a constant number of rules, below Cloudflare's static rule budget even
  // for large collections. Per-page alternates also appear in the HTML head.
  writeFileSync(join(directory, '_headers'), `/*\n  Link: ${discovery}\n  Content-Signal: ${contentSignal}\n  X-Content-Type-Options: nosniff\n/raw/*\n  Content-Type: text/markdown; charset=utf-8\n/robots.txt\n  Content-Type: text/plain; charset=utf-8\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n/sitemap.xml\n  Content-Type: application/xml; charset=utf-8\n`)
}
