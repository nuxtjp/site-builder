<script setup lang="ts">
import type { Experience } from './types'
defineProps<{ preview: Experience['preview']; icon: string; brand: string }>()
</script>
<template>
  <figure class="experience-preview" :data-preview="preview.kind">
    <figcaption class="preview-caption"><img :src="icon" width="28" height="28" alt=""><span>{{ brand }}</span><span>{{ preview.label }}</span></figcaption>
    <div class="preview-canvas">
      <p class="preview-title">{{ preview.title }}</p>
      <div class="preview-items">
        <div v-for="(row, index) in preview.rows" :key="row.label" class="preview-item">
          <span class="preview-symbol" aria-hidden="true">{{ ['◈', '◇', '↗'][index % 3] }}</span>
          <div><strong>{{ row.label }}</strong><p>{{ row.detail }}</p></div>
        </div>
      </div>
      <p class="preview-outcome"><span aria-hidden="true">↳</span> {{ preview.outcome }}</p>
    </div>
  </figure>
</template>
