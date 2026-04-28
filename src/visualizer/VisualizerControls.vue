<script setup lang="ts">
const props = defineProps<{
  displayScale: number;
  minDisplayScale?: number;
  maxDisplayScale?: number;
  isFullscreen: boolean;
  isWebcamActive: boolean;
  webcamErrorMessage?: string | null;
}>();

const emit = defineEmits<{
  "update:displayScale": [value: number];
  resetScale: [];
  toggleFullscreen: [];
  toggleWebcam: [];
}>();

function onScaleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:displayScale", Number(target.value));
}
</script>

<template>
  <section class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
      <label class="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
        Display Scale
        <input
          type="range"
          :min="minDisplayScale ?? 0.25"
          :max="maxDisplayScale ?? 4"
          step="0.05"
          :value="props.displayScale"
          class="w-full accent-amber-400"
          @input="onScaleInput"
        />
        <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
          {{ props.displayScale.toFixed(2) }}x
        </span>
      </label>

      <button
        type="button"
        class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
        @click="emit('resetScale')"
      >
        Reset Scale
      </button>

      <div class="flex flex-wrap gap-2 lg:justify-end">
        <button
          type="button"
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          @click="emit('toggleFullscreen')"
        >
          {{ props.isFullscreen ? "Exit Fullscreen" : "Fullscreen" }}
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium transition"
          :class="
            props.isWebcamActive
              ? 'bg-rose-500 text-white hover:bg-rose-400'
              : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
          "
          @click="emit('toggleWebcam')"
        >
          {{ props.isWebcamActive ? "Disable Webcam" : "Enable Webcam" }}
        </button>
      </div>
    </div>

    <p v-if="props.webcamErrorMessage" class="text-sm text-rose-300">
      {{ props.webcamErrorMessage }}
    </p>
  </section>
</template>
