<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useSeoMeta, useHead, createError } from '#imports'
import data from './.generated-documents/content.json'
import documentComponents from './.generated-documents/components.mjs'
import { h } from 'vue'
import { resolveComponent } from '#imports'
import type { SiteContent, Locale } from './types'
import SiteHeader from './components/SiteHeader.vue'
import ResourceLibrary from './components/ResourceLibrary.vue'
import DownloadOverview from './components/DownloadOverview.vue'
const route = useRoute()
const documentLink = (props: { href: string; title: string; summary?: string }) => h(resolveComponent('NuxtLink'), { to: local(props.href), class: 'site-link-card' }, () => [h('strong', props.title), props.summary ? h('span', props.summary) : null])
const markdownComponents = { DocumentLink: documentLink }
const documentComponent = computed(() => documentComponents[`${locale.value}:${path.value}`])
const locale = computed<Locale>(() => /^\/(ja|en)(\/|$)/.exec(route.path)?.[1] as Locale || data.defaultLocale as Locale)
const path = computed(() => route.path.replace(/^\/(ja|en)(?=\/|$)/, '').replace(/\/$/, '') || '/')
const content = computed(() => data.locales[locale.value] as SiteContent)
const local = (value: string, language = locale.value) => /^https:\/\//.test(value) ? value : `${language === data.defaultLocale ? '' : `/${language}`}${value === '/' ? '/' : value}`
const page = computed(() => content.value.pages.find(item => item.path === path.value && item.status !== 'draft'))
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
const alternate = computed(() => local(path.value, locale.value === 'ja' ? 'en' : 'ja'))
const articles = computed(() => content.value.pages.filter(item => item.kind === 'article' && item.status === 'published'))
const title = computed(() => `${page.value?.title.replace(/\n/g, ' ')} | ${content.value.brand}`)
useSeoMeta({ title, description: () => page.value?.summary, ogTitle: title, ogDescription: () => page.value?.summary, ogImage: () => `${data.origin}${content.value.icon}` })
useHead(() => ({ htmlAttrs: { lang: locale.value }, link: [
  { rel: 'canonical', href: `${data.origin}${local(path.value)}` },
  { rel: 'alternate', type: 'text/markdown', href: `${data.origin}/raw${local(path.value) === '/' ? '/index' : local(path.value).replace(/\/$/, '')}.md` },
  ...(['ja', 'en'] as const).map(lang => ({ rel: 'alternate' as const, type: 'text/html', hreflang: lang, href: `${data.origin}${local(path.value, lang)}` })),
  { rel: 'alternate', type: 'text/html', hreflang: 'x-default', href: `${data.origin}${local(path.value, data.defaultLocale as Locale)}` }
] }))
</script>
<template>
  <div v-if="page" class="service-site" :data-brand="data.siteId" :style="{ '--site-accent': content.accent }">
    <SiteHeader :content="content" :path="path" :local="local" :alternate="alternate" />
    <main id="content">
      <div v-if="path !== '/'" class="site-breadcrumb"><NuxtLink :to="local('/')">{{ locale === 'ja' ? 'ホーム' : 'Home' }}</NuxtLink><span aria-hidden="true">/</span><span>{{ page.label || page.title }}</span></div>
      <section class="site-hero" :class="{ 'site-hero-home': page.kind === 'home' }">
        <div><p class="site-eyebrow">{{ page.label || content.brand }}</p><h1>{{ page.title }}</h1><p class="site-lead">{{ page.summary }}</p>
          <div v-if="page.kind === 'home'" class="site-actions"><NuxtLink :to="local(content.navigation[0]!.href)" class="site-button">{{ content.navigation[0]!.title }} <span aria-hidden="true">↗</span></NuxtLink><NuxtLink :to="local(content.secondaryAction?.href || '/docs')">{{ content.secondaryAction?.title || (locale === 'ja' ? 'ガイドを読む' : 'Read the guide') }} →</NuxtLink></div>
        </div>
        <div v-if="page.kind === 'home'" class="site-brand-art" aria-hidden="true"><div class="site-orbit"></div><img :src="content.icon" width="220" height="220" alt="" fetchpriority="high"><span>{{ content.brand }}</span></div>
      </section>
      <div class="site-body">
        <component :is="documentComponent" :components="markdownComponents" class="site-document" />
        <ResourceLibrary v-if="page.kind === 'catalog'" :resources="content.resources" :locale="locale" :local="local" />
        <DownloadOverview v-if="page.kind === 'catalog' || (data.siteId === 'coela' && page.kind === 'home')" :locale="locale" />
        <section v-if="page.kind === 'journal'" class="site-journal">
          <NuxtLink v-for="article in articles" :key="article.path" :to="local(article.path)" class="site-story"><span>{{ article.category }}</span><h2>{{ article.title }}</h2><p>{{ article.summary }}</p></NuxtLink>
          <p v-if="!articles.length" class="site-empty">{{ locale === 'ja' ? '新しい記事をお届けします。テーマごとのガイドもご覧ください。' : 'New stories are on the way. Explore the topic guides in the meantime.' }}</p>
        </section>
        <section v-if="path === '/sitemap'" class="site-map"><ul><li v-for="entry in content.pages.filter(item => item.status !== 'draft' && item.path !== path)" :key="entry.path"><NuxtLink :to="local(entry.path)">{{ entry.label || entry.title.replace(/\n/g, ' ') }}</NuxtLink></li></ul></section>
      </div>
    </main>
    <footer class="site-footer"><div><strong>{{ content.brand }}</strong><p>{{ content.caption }}</p></div><nav :aria-label="locale === 'ja' ? 'フッター' : 'Footer'"><NuxtLink v-if="content.pages.some(item => item.path === '/contact')" :to="local('/contact')">{{ locale === 'ja' ? 'お問い合わせ' : 'Contact' }}</NuxtLink><NuxtLink :to="local('/privacy')">{{ locale === 'ja' ? 'プライバシー' : 'Privacy' }}</NuxtLink><NuxtLink :to="local('/security')">{{ locale === 'ja' ? 'セキュリティ' : 'Security' }}</NuxtLink><NuxtLink :to="local('/sitemap')">{{ locale === 'ja' ? 'サイトマップ' : 'Sitemap' }}</NuxtLink></nav></footer>
  </div>
</template>
