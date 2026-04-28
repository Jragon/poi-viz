<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";

import { createTransport, provideTransport } from "@/composables/useTransport";
import type { MultiRigSequence } from "@/engine/types";
import { demoSequence } from "@/visualizer/demoSequence";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import TransportControls from "@/visualizer/TransportControls.vue";
import { useVisualizerSession } from "@/visualizer/useVisualizerSession";

const props = withDefaults(
  defineProps<{
    sequence?: MultiRigSequence;
  }>(),
  {
    sequence: () => demoSequence
  }
);

const transport = provideTransport(createTransport());
const session = useVisualizerSession(() => props.sequence, transport);

const rigOrder = computed(() => props.sequence.rigs.map((rig) => rig.rigId));
const errorMessage = session.errorMessage;
const cartesianPoses = computed(() =>
  session.currentFrame.value?.ok ? session.currentFrame.value.cartesianPoses : {}
);
const trails = computed(() => session.currentTrails.value);
const transportDurationLabel = computed(() => transport.duration.value.toFixed(2));
const sceneWorldRadius = computed(() => {
  const prepared = session.playback.prepared.value;
  if (!prepared) {
    return 2;
  }

  return prepared.rigs.reduce((maxRadius, rig) => {
    const rigMaxRadius = rig.prepared.placements.reduce((maxPlacementRadius, placement) => {
      const chainRadius =
        placement.segment.hand.startPose.radius + placement.segment.head.startPose.radius;
      return Math.max(maxPlacementRadius, chainRadius);
    }, 0);

    return Math.max(maxRadius, rigMaxRadius);
  }, 2);
});

onBeforeUnmount(() => {
  session.dispose();
  transport.dispose();
});
</script>

<template>
  <section class="grid gap-4">
    <TransportControls />

    <div
      v-if="errorMessage"
      class="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-100"
    >
      <p class="text-xs uppercase tracking-[0.24em] text-rose-300">Visualizer Error</p>
      <p class="mt-3">{{ errorMessage }}</p>
    </div>

    <PoiCanvasViewport
      v-else
      :poses="cartesianPoses"
      :rig-order="rigOrder"
      :scene-world-radius="sceneWorldRadius"
      :trails="trails"
    />

    <div
      class="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 md:grid-cols-3"
    >
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Transport Window</p>
        <p class="mt-1">{{ transportDurationLabel }} units</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Rig IDs</p>
        <p class="mt-1">{{ rigOrder.join(", ") }}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Loop Model</p>
        <p class="mt-1">
          Outer transport uses `maxSequenceDuration`; inner rig looping stays in the engine.
        </p>
      </div>
    </div>
  </section>
</template>
