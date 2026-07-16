<script setup lang="ts">
import StallPatternStrip from "@/lab/experiments/qt-stall-graph/StallPatternStrip.vue";
import { WALL_PLANE_SAME_DIRECTION_PATTERNS } from "@/lab/experiments/qt-stall-graph/wallPlaneTimingPatterns";
</script>

<template>
  <div class="grid min-w-0 gap-3">
    <p class="text-xs text-slate-400">
      Right <span class="font-mono text-pink-300">URDL</span> is fixed. Shift left one checkpoint
      earlier.
    </p>
    <StallPatternStrip
      :patterns="WALL_PLANE_SAME_DIRECTION_PATTERNS"
      ariaLabel="Four stall-graph offsets with the right track fixed"
    />
    <p class="text-center font-mono text-[11px] text-slate-400">0/4 → 1/4 → 2/4 → 3/4 → 0/4</p>
  </div>
</template>
