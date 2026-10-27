import { escapeMarkdown } from './source.mjs'
const attribute = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export function encodeDocument(page) {
  const { sections, ...metadata } = page
  const lines = ['---', ...Object.entries(metadata).map(([key, value]) => key + ': ' + JSON.stringify(value)), '---', '']
  for (const section of sections) {
    lines.push('## ' + escapeMarkdown(section.title), '', escapeMarkdown(section.text), '')
    if (section.code) {
      const ticks = Math.max(3, ...Array.from(section.code.matchAll(/`+/g), value => value[0].length + 1))
      const fence = '`'.repeat(ticks)
      lines.push(fence, section.code, fence, '')
    }
    for (const link of section.links ?? []) lines.push('::document-link{' + Object.entries(link).map(([key, value]) => `${key}="${attribute(value)}"`).join(' ') + '}', '::', '')
  }
  return lines.join('\n') + '\n'
}
