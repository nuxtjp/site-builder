<script setup lang="ts">
import { computed, h, resolveComponent } from 'vue'
import { useHead, useRuntimeConfig } from '#imports'
import documentComponents from '#build/nuxtjp-default-documents.mjs'
import type { DocumentId } from '../../../contracts/types'
import { useLocalizedSite } from '../composables/useLocalizedSite'

const site = useLocalizedSite()
const runtime = useRuntimeConfig().public
const presentation = runtime.nuxtJpPresentation
const snapshot = presentation && presentation.scope !== 'product' && runtime.nuxtJpOssShowcase ? JSON.parse(runtime.nuxtJpOssShowcase) : null
const observedNow = Date.now()
const documentId = computed(() => site.pageId.value && site.pageId.value !== 'landing' ? site.pageId.value as DocumentId : undefined)
const document = computed(() => documentId.value ? site.content.value.docs[documentId.value] : undefined)
const documentComponent = computed(() => documentComponents[`${site.locale.value}:${document.value?.slug || '/'}`])
const documentLink = (props: { href: string; title: string; summary?: string }) => h(resolveComponent('NuxtLink'), {
  to: site.localePath(site.locale.value, props.href), class: 'nls-primary-link',
}, () => [h('strong', props.title), props.summary ? h('span', props.summary) : null])
const markdownComponents = { DocumentLink: documentLink }
useHead(() => {
  const path = site.localePath(site.locale.value, document.value?.slug || '/')
  return { link: [{ rel: 'alternate', type: 'text/markdown', href: `${site.config.origin}/raw${path === '/' ? '/index' : path}.md` }] }
})
</script>

<template>
  <article :class="[documentId ? 'nls-document' : 'nls-landing', { 'editorial-landing': !documentId && presentation, 'product-landing': !documentId && presentation?.scope === 'product' }]">
    <header :class="{ 'editorial-hero': !documentId && presentation }">
      <p class="nls-eyebrow">{{ site.content.value.brand }}</p>
      <h1>{{ document?.title || (presentation ? site.content.value.tagline : site.content.value.brand) }}</h1>
      <p class="nls-tagline">{{ document?.summary || (presentation ? site.content.value.summary : site.content.value.tagline) }}</p>
      <p v-if="!document && !presentation">{{ site.content.value.summary }}</p>
    </header>
    <component :is="documentComponent" :components="markdownComponents" />
    <section v-if="!documentId && snapshot" class="editorial-adoption">
      <h2>{{ site.locale.value === 'ja' ? '公開パッケージの利用状況。' : 'A view of public package adoption.' }}</h2>
      <NuxtJpDownloadSummary :feed="snapshot" :locale="site.locale.value" :now="observedNow" />
      <NuxtLink :to="site.localePath(site.locale.value, '/oss')">{{ site.locale.value === 'ja' ? '個別のパッケージと詳細へ' : 'Packages and individual observations' }} ↗</NuxtLink>
    </section>
  </article>
</template>

<style scoped>
.nls-document :deep(.site-section), .nls-landing :deep(.site-section) { margin-block: 2.5rem; }
:deep(.site-number) { display: none; }
:deep(.site-links) { display: grid; gap: 1rem; }
:deep(.nls-primary-link span) { display: block; font-weight: 400; }
:deep(pre) { max-width: 100%; overflow-x: auto; }
</style>
