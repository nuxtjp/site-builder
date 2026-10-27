<script setup lang="ts">
import { useRuntimeConfig } from '#imports'
import type { Locale } from './types'
defineProps<{ locale: Locale }>()
const value = useRuntimeConfig().public.nuxtJpOssShowcase
const feed = typeof value === 'string' && value ? JSON.parse(value) : null
const observed = Date.now()
</script>
<template>
  <section v-if="feed" class="site-downloads"><h2>{{ locale === 'ja' ? '公開パッケージの利用状況' : 'Public package downloads' }}</h2><NuxtJpDownloadSummary :feed="feed" :locale="locale" :now="observed" /></section>
</template>
