<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useSeoMeta, useHead, createError } from '#imports'
import ServicePreview from './ServicePreview.vue'
import VisitorPaths from './VisitorPaths.vue'
import PageNextSteps from './PageNextSteps.vue'
import type { FunctionalComponent } from 'vue'
import type { SiteContent, Locale, ServiceSiteData, ServiceExperiences, Link } from './types'
import ServiceDocument from './ServiceDocument.vue'
import SiteHeader from './SiteHeader.vue'
import ResourceLibrary from './ResourceLibrary.vue'
import DownloadOverview from './DownloadOverview.vue'
const props = withDefaults(defineProps<{
  data: ServiceSiteData
  documents: Record<string, FunctionalComponent>
  experiences?: ServiceExperiences
  appearance?: 'service' | 'portfolio'
  navigationMode?: 'mobile-menu' | 'tablet-menu'
  heroVariants?: Record<string, 'policy' | 'install'>
  nextStepExclusions?: string[]
  downloads?: boolean
}>(), { appearance: 'service', navigationMode: 'mobile-menu', heroVariants: () => ({}), nextStepExclusions: () => ['/contact', '/privacy', '/security', '/sitemap'], downloads: true })
const data = computed(() => props.data)
const route = useRoute()
const documentComponent = computed(() => props.documents[`${locale.value}:${path.value}`])
const Document: FunctionalComponent = () => h(ServiceDocument, { document: documentComponent.value, local })
const locale = computed<Locale>(() => /^\/(ja|en)(\/|$)/.exec(route.path)?.[1] as Locale || data.value.defaultLocale as Locale)
const path = computed(() => route.path.replace(/^\/(ja|en)(?=\/|$)/, '').replace(/\/$/, '') || '/')
const experience = computed(() => props.experiences?.[locale.value])
const content = computed(() => data.value.locales[locale.value] as SiteContent)
const primary = computed<Link>(() => experience.value?.primary || content.value.navigation[0] || { href: '/docs', title: locale.value === 'ja' ? 'ガイド' : 'Guide' })
const secondary = computed<Link>(() => experience.value?.secondary || content.value.secondaryAction || { href: '/docs', title: locale.value === 'ja' ? 'ガイドを読む' : 'Read the guide' })
const local = (value: string, language = locale.value) => /^https:\/\//.test(value) ? value : `${language === data.value.defaultLocale ? '' : `/${language}`}${value === '/' ? '/' : value}`
const page = computed(() => content.value.pages.find(item => item.path === path.value && item.status !== 'draft'))
const parent = computed(() => {
  const parentPath = path.value.slice(0, path.value.lastIndexOf('/'))
  return parentPath ? content.value.pages.find(item => item.path === parentPath && item.status !== 'draft') : undefined
})
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
const alternate = computed(() => local(path.value, locale.value === 'ja' ? 'en' : 'ja'))
const articles = computed(() => content.value.pages.filter(item => item.kind === 'article' && item.status === 'published'))
const title = computed(() => `${page.value?.title.replace(/\n/g, ' ')} | ${content.value.brand}`)
useSeoMeta({ title, description: () => page.value?.summary, ogTitle: title, ogDescription: () => page.value?.summary, ogImage: () => `${data.value.origin}${content.value.icon}` })
useHead(() => ({ htmlAttrs: { lang: locale.value }, link: [
  { rel: 'canonical', href: `${data.value.origin}${local(path.value)}` },
  { rel: 'alternate', type: 'text/markdown', href: `${data.value.origin}/raw${local(path.value) === '/' ? '/index' : local(path.value).replace(/\/$/, '')}.md` },
  ...(['ja', 'en'] as const).map(lang => ({ rel: 'alternate' as const, type: 'text/html', hreflang: lang, href: `${data.value.origin}${local(path.value, lang)}` })),
  { rel: 'alternate', type: 'text/html', hreflang: 'x-default', href: `${data.value.origin}${local(path.value, data.value.defaultLocale as Locale)}` }
] }))

const context = computed(() => ({ locale: locale.value, path: path.value, page: page.value!, content: content.value, local, Document }))
</script>
<template>
  <div v-if="page" class="service-site" :data-brand="data.siteId" :data-page-kind="page.kind" :data-presentation="appearance" :data-navigation="navigationMode" :style="{ '--site-accent': content.accent }">
    <SiteHeader :content="content" :path="path" :local="local" :alternate="alternate" :primary="primary" />
    <main id="content">
      <div v-if="path !== '/'" class="site-breadcrumb"><NuxtLink :to="local('/')">{{ locale === 'ja' ? 'ホーム' : 'Home' }}</NuxtLink><span aria-hidden="true">/</span><template v-if="parent"><NuxtLink :to="local(parent.path)">{{ parent.label || parent.title }}</NuxtLink><span aria-hidden="true">/</span></template><span aria-current="page">{{ page.label || page.title }}</span></div>
      <section class="site-hero" :class="[{ 'site-hero-home': page.kind === 'home' }, heroVariants[path] ? `site-hero-${heroVariants[path]}` : '']">
        <div><p v-if="page.kind === 'home'" class="site-eyebrow">{{ experience?.category || content.brand }}</p><h1>{{ page.title }}</h1><p class="site-lead">{{ page.summary }}</p>
          <div v-if="page.kind === 'home'" class="site-actions"><NuxtLink :to="local(primary.href)" class="site-button">{{ primary.title }} <span aria-hidden="true">↗</span></NuxtLink><NuxtLink :to="local(secondary.href)">{{ secondary.title }} →</NuxtLink></div>
        </div>
        <slot v-if="page.kind === 'home'" name="hero-art" v-bind="context">
          <ServicePreview v-if="experience" :preview="experience.preview" :icon="content.icon" :brand="content.brand" />
          <div v-else class="site-brand-art" aria-hidden="true"><img :src="content.icon" width="220" height="220" alt=""><span>{{ content.brand }}</span></div>
        </slot>
      </section>
      <div class="site-body" :class="{ 'site-body-privacy': path === '/privacy' }">
        <VisitorPaths v-if="page.kind === 'home' && experience" :experience="experience" :local="local" />
        <ResourceLibrary v-if="page.kind === 'catalog'" :resources="content.resources" :locale="locale" :local="local" />
        <slot name="before-document" v-bind="context" />
        <slot name="document" v-bind="context"><ServiceDocument :document="documentComponent" :local="local" /></slot>
        <slot name="after-document" v-bind="context" />
        <DownloadOverview v-if="downloads && page.kind === 'catalog'" :locale="locale" />
        <section v-if="page.kind === 'journal'" class="site-journal">
          <NuxtLink v-for="article in articles" :key="article.path" :to="local(article.path)" class="site-story"><span>{{ article.category }}</span><h2>{{ article.title }}</h2><p>{{ article.summary }}</p></NuxtLink>
          <p v-if="!articles.length" class="site-empty">{{ locale === 'ja' ? '新しい記事をお届けします。テーマごとのガイドもご覧ください。' : 'New stories are on the way. Explore the topic guides in the meantime.' }}</p>
        </section>
        <section v-if="path === '/sitemap'" class="site-map"><ul><li v-for="entry in content.pages.filter(item => item.status !== 'draft' && item.path !== path)" :key="entry.path"><NuxtLink :to="local(entry.path)">{{ entry.label || entry.title.replace(/\n/g, ' ') }}</NuxtLink></li></ul></section>
        <slot name="next-steps" v-bind="context">
          <PageNextSteps v-if="experience && page.kind !== 'home' && !nextStepExclusions.includes(path)" :experience="experience" :page="page" :locale="locale" :local="local" />
        </slot>
      </div>
    </main>
    <footer class="site-footer"><div><strong>{{ content.brand }}</strong><p>{{ content.caption }}</p></div><nav :aria-label="locale === 'ja' ? 'フッター' : 'Footer'"><NuxtLink v-for="item in content.navigation" :key="item.href" :to="local(item.href)">{{ item.title }}</NuxtLink><NuxtLink v-if="content.pages.some(item => item.path === '/contact')" :to="local('/contact')">{{ locale === 'ja' ? 'お問い合わせ' : 'Contact' }}</NuxtLink><NuxtLink :to="local('/privacy')">{{ locale === 'ja' ? 'プライバシー' : 'Privacy' }}</NuxtLink><NuxtLink :to="local('/security')">{{ locale === 'ja' ? 'セキュリティ' : 'Security' }}</NuxtLink><slot name="footer-links" v-bind="context" /><NuxtLink :to="local('/sitemap')">{{ locale === 'ja' ? 'サイトマップ' : 'Sitemap' }}</NuxtLink></nav></footer>
  </div>
</template>
