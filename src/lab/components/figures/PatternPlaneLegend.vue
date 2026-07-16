<script setup lang="ts">
import { LAB_PLANE_COLORS, LAB_PLANE_LABELS, LAB_PLANE_ORDER } from "@/lab/planePresentation";
</script>

<template>
  <ul class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400" aria-label="Plane key">
    <li v-for="planeId in LAB_PLANE_ORDER" :key="planeId" class="flex items-center gap-1.5">
      <span
        class="h-0.5 w-5 rounded-full"
        :style="{ backgroundColor: LAB_PLANE_COLORS[planeId] }"
        aria-hidden="true"
      />
      {{ LAB_PLANE_LABELS[planeId] }}
    </li>
    <li class="flex items-center gap-1.5">
      <span class="h-0 w-5 border-t border-dashed border-slate-400" aria-hidden="true" />
      Right track
    </li>
  </ul>
</template>
