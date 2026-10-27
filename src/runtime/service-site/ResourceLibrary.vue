<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Resource, Locale } from './types'
const props = defineProps<{ resources: Resource[]; locale: Locale; local: (path: string) => string }>()
const query = ref('')
const category = ref('')
const categories = computed(() => [...new Set(props.resources.map(item => item.category))])
const visible = computed(() => props.resources.filter(item => (!category.value || item.category === category.value) && `${item.title} ${item.summary}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
</script>
<template>
  <section class="site-library" :aria-label="locale === 'ja' ? 'ライブラリを探す' : 'Explore the library'">
    <div class="site-filters">
      <label>{{ locale === 'ja' ? 'キーワード' : 'Keyword' }}<input v-model="query" type="search" :placeholder="locale === 'ja' ? '名前や機能で探す' : 'Search names or features'"></label>
      <label>{{ locale === 'ja' ? 'カテゴリ' : 'Category' }}<select v-model="category"><option value="">{{ locale === 'ja' ? 'すべて' : 'All' }}</option><option v-for="name in categories" :key="name">{{ name }}</option></select></label>
    </div>
    <p class="site-result-count" role="status">{{ visible.length }} {{ locale === 'ja' ? '件' : 'resources' }}</p>
    <div v-for="name in categories.filter(name => visible.some(item => item.category === name))" :key="name" class="site-category">
      <h2>{{ name }}</h2><div class="site-resource-grid"><article v-for="item in visible.filter(item => item.category === name)" :key="item.href">
        <h3><NuxtLink :to="local(item.href)">{{ item.title }} <span aria-hidden="true">↗</span></NuxtLink></h3><p>{{ item.summary }}</p><small v-if="item.license">{{ item.license }}</small>
      </article></div>
    </div>
    <p v-if="!visible.length" class="site-empty">{{ locale === 'ja' ? '条件に合う項目が見つかりません。キーワードやカテゴリを変更してください。' : 'No matches. Try another keyword or category.' }}</p>
  </section>
</template>
