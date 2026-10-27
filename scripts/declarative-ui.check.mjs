import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validatePageAdapter } from '../templates/declarative.mjs'

test('route adapters reject CSS blocks, stylesheet imports and inline bindings', () => {
  const directory = mkdtempSync(join(tmpdir(), 'declarative-page-'))
  try {
    const file = join(directory, 'page.vue')
    for (const source of [
      '<template><main /></template><style scoped>main{color:red}</style>',
      '<template><main /></template><style src="./theme.css" />',
      '<template><main style="color:red" /></template>',
      '<template><main :style="theme" /></template>',
      '<template><main v-bind:style="theme" /></template>',
      '<script setup>import "./theme.css"</script><template><SiteShell /></template>',
    ]) {
      writeFileSync(file, source)
      assert.throws(() => validatePageAdapter(file), /cannot/)
    }
    writeFileSync(file, '<script setup>import data from "./site.json"</script><template><SiteShell :data="data"><template #document><PolicyDocument /></template></SiteShell></template>')
    assert.doesNotThrow(() => validatePageAdapter(file))
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('all module route pages and the shipped scaffold are CSS-free adapters', () => {
  for (const name of readdirSync(new URL('../src/runtime/app/pages/', import.meta.url))) {
    if (name.endsWith('.vue')) validatePageAdapter(new URL('../src/runtime/app/pages/' + name, import.meta.url))
  }
  validatePageAdapter(new URL('../templates/service-site/SitePage.vue', import.meta.url))
})
