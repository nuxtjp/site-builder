<script setup lang="ts">
import data from './.generated-documents/content.json'
import documents from './.generated-documents/components.mjs'
import type { ServiceSiteData } from '@nuxtjp/localized-site/service-site'
const siteData = data as ServiceSiteData
</script>
<template><NuxtJpServiceSite :data="siteData" :documents="documents" /></template>
