import assert from 'node:assert/strict'
import { parseMarkdown, stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import { documentLayout } from './layout.mjs'

const allowed = new Set(['path', 'title', 'summary', 'label', 'kind', 'status', 'category'])
const text = node => node.type === 'break' ? '\n' : node.value ?? node.children?.map(text).join('') ?? ''
export const escapeMarkdown = value => String(value).replace(/[\\`*_{}\[\]<>#!|~:]/g, '\\$&')
export function publicHref(value, allowHttp = false) {
  assert.equal(typeof value, 'string', 'public link must be a string')
  assert.ok(!/[\\\u0000-\u0020\u007f]/.test(value), 'public link contains unsafe characters')
  assert.ok(/^\/(?!\/)/.test(value) || (allowHttp ? /^https?:\/\// : /^https:\/\//).test(value) || /^#[a-zA-Z0-9_-]+$/.test(value), 'public link scheme refused')
  if (/^https?:/.test(value)) {
    const url = new URL(value)
    assert.equal(url.username + url.password, '', 'credential-bearing public URL refused')
  }
  return value.replace(/[()<>]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())
}
function publicProfile() {
  return (tree, file) => {
    assert.ok(Object.keys(file.data).every(key => allowed.has(key)), 'unknown public metadata')
    const sections = []; let section
    function inspect(node) {
      assert.notEqual(node.type, 'html', 'raw HTML is not a public document component')
      if (node.type.endsWith('Component')) {
        assert.equal(node.type, 'containerComponent', 'only block components are registered')
        assert.equal(node.name, 'document-link', 'unregistered MDC component or binding')
        assert.equal(node.children.length, 0, 'document-link has no executable children')
        const link = node.attributes
        assert.ok(Object.keys(link).every(key => ['title', 'href', 'summary', 'icon'].includes(key)), 'unknown or executable link attribute')
        assert.ok(Object.values(link).every(value => typeof value === 'string'), 'document attributes must be literal strings')
        assert.ok(link.title?.trim(), 'link title required')
        publicHref(link.href)
        if (link.icon) assert.match(link.icon, /^\/brand\/[a-zA-Z0-9/_.-]+\.(svg|png)$/)
        ;(section.links ??= []).push({ ...link })
      } else {
        assert.ok(!node.attributes || Object.keys(node.attributes).length === 0, 'unregistered Markdown attributes')
      }
      if (['link', 'image', 'definition'].includes(node.type)) publicHref(node.url)
      for (const child of node.children ?? []) inspect(child)
    }
    for (const node of tree.children) {
      if (node.type === 'heading' && node.depth === 2) {
        section = { title: text(node), text: '' }; sections.push(section)
      } else {
        assert.ok(section, 'body must start with a level-two section heading')
        if (node.type === 'paragraph') section.text += (section.text ? '\n\n' : '') + text(node)
        if (node.type === 'code') section.code = node.value
      }
      inspect(node)
    }
    file.data.documentSections = sections
  }
}
export async function parseDocument(source, { resolveHref = href => href } = {}) {
  assert.ok(Buffer.byteLength(source) <= 131072, 'document byte limit exceeded')
  assert.match(source, /^---\r?\n/, 'page frontmatter must precede the body')
  // The official parser contains per-document slug state. Do not share it across files.
  const parsed = await parseMarkdown(source, { highlight: false, contentHeading: false, toc: false,
    remark: { plugins: { publicProfile: { instance: publicProfile } } } })
  const { documentSections: sections, ...page } = parsed.data
  assert.ok(Object.keys(page).every(key => allowed.has(key)), 'unknown public metadata')
  assert.match(page.path, /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/)
  assert.ok(typeof page.title === 'string' && page.title.trim() && typeof page.summary === 'string' && page.summary.trim(), 'title and summary required')
  assert.ok(['published', 'draft'].includes(page.status), 'explicit publication status required')
  assert.ok(['home', 'page', 'catalog', 'journal', 'article'].includes(page.kind), 'unknown document kind')
  const nativeTags = new Set(['p', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'blockquote', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'hr', 'br', 'img', 'input', 'document-link'])
  function validate(node) {
    if (node.type === 'element') {
      assert.ok(nativeTags.has(node.tag), 'unregistered MDC element')
      assert.ok(!Object.keys(node.props || {}).some(key => /^[:@]|^v-|^on/i.test(key)), 'executable document attribute refused')
      if (node.props?.href) publicHref(node.props.href)
      if (node.props?.src) publicHref(node.props.src)
    }
    for (const child of node.children ?? []) validate(child)
  }
  validate(parsed.body)
  function plain(node) {
    if (node.tag === 'document-link') {
      const { title, href, summary } = node.props
      return { type: 'element', tag: 'p', props: {}, children: [
        { type: 'element', tag: 'a', props: { href: publicHref(resolveHref(href), true) }, children: [{ type: 'text', value: title }] },
        ...(summary ? [{ type: 'text', value: ' — ' + summary }] : [])
      ] }
    }
    const copy = { ...node, ...(node.props ? { props: { ...node.props } } : {}) }
    if (copy.props?.href) copy.props.href = publicHref(resolveHref(copy.props.href), true)
    if (copy.props?.src) copy.props.src = publicHref(resolveHref(copy.props.src), true)
    if (node.children) copy.children = node.children.map(plain)
    return copy
  }
  const markdown = await stringifyMarkdown(plain(parsed.body))
  return { page: { ...page, sections }, body: documentLayout(parsed.body), markdown: markdown.trim() }
}
