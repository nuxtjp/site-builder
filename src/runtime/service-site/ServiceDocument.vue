<script setup lang="ts">
import { h, resolveComponent, type FunctionalComponent } from 'vue'
import type { Link } from './types'
const props = defineProps<{ document: FunctionalComponent | undefined; local: (path: string) => string }>()
const DocumentLink = (link: Link) => h(resolveComponent('NuxtLink'), { to: props.local(link.href), class: 'site-link-card' }, () => [
  link.icon ? h('img', { src: link.icon, width: 48, height: 48, alt: '', loading: 'lazy' }) : null,
  h('span', [h('strong', link.title), link.summary ? h('span', link.summary) : null]),
  h('span', { 'aria-hidden': 'true' }, '↗'),
])
const components = { DocumentLink }
</script>
<template><component :is="document" :components="components" class="site-document" /></template>
