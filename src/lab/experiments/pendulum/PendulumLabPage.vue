<script setup lang="ts">
import CirclePendulumExperiment from "./CirclePendulumExperiment.vue";
import PendulumDriverPreview from "./PendulumDriverPreview.vue";
import RastaxelPendulumExperiment from "./RastaxelPendulumExperiment.vue";
</script>

<template>
  <main class="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-5 py-8 md:px-8 md:py-12">
    <header class="grid gap-2">
      <p class="text-xs font-medium uppercase tracking-[0.22em] text-sky-300">Motion lab</p>
      <h1 class="text-3xl font-semibold text-slate-100">Pendulum driver</h1>
      <p class="max-w-3xl text-sm leading-6 text-slate-400">
        Explore a deterministic angular oscillator on the hand, the poi head, or both. One full
        oscillator cycle contains two apex-to-apex pendulum beats. The driver preview is separated
        from the calibration experiment so each surface can stay focused.
      </p>
    </header>

    <PendulumDriverPreview />

    <CirclePendulumExperiment />

    <RastaxelPendulumExperiment />
  </main>
</template>
