<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRuntimeConfig, useHead } from '#imports'
import { validateShowcaseFeed, summarizeDownloads } from '@nuxtjp/localized-site/showcase'
import { useLocalizedSite } from '../composables/useLocalizedSite'
const site = useLocalizedSite(), route = useRoute()
const original = validateShowcaseFeed(JSON.parse(useRuntimeConfig().public.nuxtJpOssShowcase ?? 'null'))
const organizationSnapshot = useRuntimeConfig().public.nuxtJpOrganizationShowcase
const organizations = organizationSnapshot ? validateShowcaseFeed(JSON.parse(organizationSnapshot)) : null
const portfolio = useRuntimeConfig().public.nuxtJpPresentation?.scope === 'portfolio'
const editorial = Boolean(useRuntimeConfig().public.nuxtJpPresentation)
const organizationEntries = organizations?.entries.filter(entry => entry.id !== 'coela-oss-site' && !new URL(entry.homepage).hostname.endsWith('.invalid')) ?? []
function organizationMetrics(id: string) {
  const owner = id.endsWith('-site') ? id.slice(0, -5) : ''
  return summarizeDownloads({ ...original, entries: original.entries.filter(entry => entry.repository && new URL(entry.repository).pathname.split('/')[1] === owner) }, now)
}
const query = ref(''), now = Date.now()
const entryId = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const index = parts.indexOf('oss')
  return parts[index + 1]
})
const selected = computed(() => original.entries.find(entry => entry.id === entryId.value))
const feed = computed(() => ({ ...original, entries: original.entries.filter(entry =>
  (!entryId.value || entry.id === entryId.value) &&
  `${entry.id} ${entry.repository ?? ''} ${entry.name.ja} ${entry.name.en} ${entry.summary.ja} ${entry.summary.en}`.toLowerCase().includes(query.value.toLowerCase())) }))
const ja = computed(() => site.locale.value === 'ja')
useHead(() => {
  const title = `${selected.value?.name[site.locale.value] ?? (ja.value ? 'OSS・モジュール' : 'OSS & modules')} · ${site.content.value.brand}`
  const description = selected.value?.summary[site.locale.value] ?? site.content.value.summary
  return { title, meta: [{ name: 'description', content: description },
    { property: 'og:title', content: title }, { property: 'og:description', content: description }] }
})
</script>
<template>
  <article class="oss-page" :class="{ 'editorial-catalog': editorial }">
    <header class="oss-intro">
      <p>{{ original.owner }}</p>
      <h1>{{ selected?.name[site.locale.value] ?? (portfolio ? (ja ? 'アイデアの、つながる先。' : 'Where the ideas connect.') : (ja ? '公開コードから、次の選択を。' : 'Choose your next building block.')) }}</h1>
      <p>{{ portfolio ? (ja ? 'Coelaが取り組むOSSを、組織ごとの紹介サイトからたどれます。個別のプロジェクトと使い方は、それぞれのサイトへ。' : 'Explore the OSS I work on through each organization’s own site. Follow the links for individual projects and how to use them.') : (ja ? 'プロジェクトの用途、ソースと公開パッケージを紹介します。' : 'Explore project purposes, source repositories and published packages.') }}</p>
      <p>{{ ja ? '数値は期間付きの公開スナップショットです。未取得・期限切れと0件を区別します。' : 'Counts are dated public snapshots. Unavailable and stale observations are distinct from zero.' }}</p>
      <NuxtLink v-if="entryId" :to="site.localePath(site.locale.value, '/oss')">{{ ja ? '一覧へ' : 'All modules' }}</NuxtLink>
      <a v-if="organizations && !entryId && !portfolio" href="#organizations">{{ ja ? '組織の紹介サイトへ' : 'Explore organization sites' }}</a>
      <label v-if="!entryId && !portfolio">{{ ja ? '名前・用途で探す' : 'Search names and purposes' }}
        <input v-model="query" type="search" maxlength="200" :placeholder="ja ? '例：文書、権限、Nuxt' : 'Documents, permissions, Nuxt'">
      </label>
    </header>
    <template v-if="portfolio">
      <NuxtJpDownloadSummary :feed="original" :locale="site.locale.value" :now="now" />
      <section class="organization-directory" :aria-label="ja ? '組織の紹介サイト' : 'Organization sites'">
        <article v-for="entry in organizationEntries" :key="entry.id">
          <div><p class="editorial-eyebrow">{{ entry.id.slice(0, -5) }}</p><h2>{{ entry.name[site.locale.value] }}</h2><p>{{ entry.summary[site.locale.value] }}</p></div>
          <div class="organization-adoption"><p v-for="group in organizationMetrics(entry.id)" :key="`${group.registry}:${group.start}:${group.end}`"><strong>{{ group.available ? group.downloads.toLocaleString(site.locale.value) : '—' }}</strong> {{ group.registry }} · {{ group.start }} — {{ group.end }}<small>{{ ja ? '取得済み' : 'Observed' }} {{ group.available }} / {{ ja ? '未取得' : 'Unavailable' }} {{ group.unavailable }} / {{ ja ? '期限切れ' : 'Stale' }} {{ group.stale }}</small></p><a :href="entry.homepage">{{ ja ? '紹介サイトへ' : 'Visit the site' }} ↗</a></div>
        </article>
      </section>
    </template>
    <NuxtJpOssShowcase v-else data-showcase="modules" :feed="feed" :locale="site.locale.value" :now="now">
      <template #heading="{ owner }"><h2>{{ owner }}</h2></template>
      <template #entry="{ entry }">
        <NuxtLink v-if="!entryId" :to="site.localePath(site.locale.value, `/oss/${entry.id}`)">{{ ja ? '役割・利用情報' : 'Role & adoption' }}</NuxtLink>
        <template v-else>
          <a :href="entry.homepage">{{ ja ? '公開ドキュメント' : 'Public documentation' }}</a>
          <p>{{ ja ? '利用する際はownerのREADME・LICENSE・公開版と受入条件を確認してください。' : 'Review the owner README, license, available release and acceptance requirements before adoption.' }}</p>
          <a v-if="entry.repository" :href="`${entry.repository}/issues`">{{ ja ? '改善案・不具合を伝える' : 'Feedback & issues' }}</a>
          <p>{{ ja ? '対象URL・package版・再現手順を添えてください。秘密鍵・token・実顧客データは送らないでください。' : 'Include the page URL, package version and reproduction steps. Do not share tokens, keys or customer data.' }}</p>
        </template>
      </template>
    </NuxtJpOssShowcase>
    <section v-if="organizations && !entryId && !portfolio" id="organizations">
    <NuxtJpOssShowcase v-if="organizations && !entryId" :feed="organizations" :locale="site.locale.value" :now="now" :kind-label="ja ? '組織の紹介サイト・公開候補' : 'Organization site candidates'">
      <template #heading><h2>{{ ja ? '各組織の提供価値を知る' : 'Explore the organizations' }}</h2></template>
    </NuxtJpOssShowcase>
    </section>
  </article>
</template>
<style scoped>
.oss-page:not(.editorial-catalog) { --showcase-accent: #17634b; --showcase-background: #edf6f1; --showcase-border: #abcbbb; }
.oss-intro { max-width: 55rem; margin: 0 auto 2rem; padding: 1.5rem; }
h1 { font-size: clamp(2.4rem, 6vw, 4.5rem); line-height: 1.12; letter-spacing: -.035em; }
label { display: block; margin-top: 2rem; } input { display: block; width: 100%; padding: .9rem; margin-top: .5rem; border: 1px solid #7a9b8a; border-radius: .45rem; font: inherit; box-sizing: border-box; }
.oss-page:not(.editorial-catalog) a { color: #17634b; } .oss-page:not(.editorial-catalog) a:focus-visible, .oss-page:not(.editorial-catalog) input:focus-visible { outline: 3px solid #d48b22; outline-offset: 3px; }
.editorial-catalog .oss-intro{max-width:none;margin:0 0 50px;padding:0}.organization-directory>article{display:grid;grid-template-columns:1.3fr 1fr;gap:60px;padding-block:35px;border-top:1px solid var(--showcase-border)}.organization-directory h2{margin-block:12px}.organization-directory p{font-size:14px}.organization-adoption strong{font-size:32px;letter-spacing:-.05em;font-weight:500}.organization-adoption small{display:block;font-size:11px}.organization-adoption a{display:inline-block;font-size:13px;margin-top:18px;padding-bottom:5px;border-bottom:1px solid currentColor}.organization-directory .editorial-eyebrow{font-size:11px}.editorial-catalog a{color:var(--editorial-accent)}@media(max-width:640px){.organization-directory>article{grid-template-columns:1fr;gap:12px}}
</style>
