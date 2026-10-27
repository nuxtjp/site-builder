// Presentation transform over the official MDC AST; source parsing stays upstream.
const element = (tag, className, children) => ({ type: 'element', tag,
  props: className ? { className } : {}, children })
export function documentLayout(tree) {
  const output = []; let body, links, count = 0
  for (const node of tree.children) {
    if (node.tag === 'h2') {
      count++
      const number = element('span', 'site-number', [{ type: 'text', value: String(count).padStart(2, '0') }])
      number.props['aria-hidden'] = 'true'
      body = element('div', 'site-section-body', [])
      output.push(element('section', 'site-section', [element('div', 'site-section-heading', [number, node]), body]))
      links = undefined
    } else if (body) {
      if (node.tag === 'document-link') {
        if (!links) { links = element('div', 'site-links', []); body.children.push(links) }
        links.children.push(node)
      } else {
        if (node.tag === 'pre') node.props.className = [...(Array.isArray(node.props.className) ? node.props.className : []), 'site-code']
        body.children.push(node); links = undefined
      }
    } else output.push(node)
  }
  return { ...tree, children: output }
}
