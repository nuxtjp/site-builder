import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, compileTemplate } from 'vue/compiler-sfc'

// Route adapters compose data and components. Presentation CSS belongs to the
// supplying module or a component, including its external stylesheet imports.
export function validatePageAdapter(file) {
  const source = readFileSync(file, 'utf8')
  assert.ok(Buffer.byteLength(source) <= 131072, 'page adapter byte limit exceeded')
  const { descriptor, errors } = parse(source, { filename: String(file) })
  assert.equal(errors.length, 0, 'invalid page adapter')
  assert.equal(descriptor.styles.length, 0, 'page adapters cannot contain style blocks')
  assert.ok(descriptor.template && !descriptor.template.src, 'inline component composition required')
  for (const script of [descriptor.script, descriptor.scriptSetup]) {
    assert.ok(!script?.src, 'external page scripts are not declarative adapters')
    assert.ok(!/\.(?:css|scss|sass|less|styl)(?:[?'"`])/.test(script?.content || ''), 'page adapters cannot import CSS')
  }
  const template = compileTemplate({ source: descriptor.template.content, filename: String(file), id: 'page-adapter' })
  assert.equal(template.errors.length, 0, 'invalid page template')
  function inspect(node) {
    for (const prop of node.props || []) {
      assert.ok(prop.name !== 'style' && !(prop.name === 'bind' && prop.arg?.content === 'style'), 'page adapters cannot declare inline styles')
    }
    for (const child of [...node.children || [], ...node.branches || []]) inspect(child)
  }
  inspect(template.ast)
}
