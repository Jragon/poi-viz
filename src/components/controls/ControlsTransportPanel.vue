<script setup lang="ts">
interface ControlsTransportPanelProps {
  isPlaying: boolean;
  isStaticView: boolean;
  loopedPlayheadBeats: number;
  loopBeats: number;
  scrubStep: number;
}

const props = defineProps<ControlsTransportPanelProps>();

const emit = defineEmits<{
  (event: "toggle-playback"): void;
  (event: "set-static-view", value: boolean): void;
  (event: "set-scrub", value: number): void;
}>();

function parseFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function onScrubInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const parsed = parseFiniteNumber(target.value);
  if (parsed === null) {
    return;
  }

  emit("set-scrub", parsed);
}

function onStaticViewInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  emit("set-static-view", target.checked);
}
</script>

<template>
  <details class="rounded border border-zinc-800 p-3" open>
    <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Transport</summary>
    <div class="mt-3">
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="rounded border border-zinc-700 px-3 py-2 text-sm font-medium hover:border-zinc-500"
          type="button"
          :disabled="props.isStaticView"
          :class="props.isStaticView ? 'cursor-not-allowed opacity-50' : ''"
          @click="emit('toggle-playback')"
        >
          {{ props.isPlaying ? "Pause" : "Play" }}
        </button>
        <p class="text-sm text-zinc-400">Playhead: {{ props.loopedPlayheadBeats.toFixed(3) }} beats</p>
        <label class="ml-auto flex items-center gap-2 text-sm text-zinc-300">
          <input class="accent-cyan-400" type="checkbox" :checked="props.isStaticView" @change="onStaticViewInput" />
          Static View
        </label>
      </div>

      <label class="mt-3 block text-xs uppercase tracking-wide text-zinc-500">
        Scrub
        <input
          class="mt-2 w-full accent-cyan-400"
          type="range"
          min="0"
          :max="props.loopBeats"
          :step="props.scrubStep"
          :value="props.loopedPlayheadBeats"
          @input="onScrubInput"
        />
      </label>
      <p class="mt-2 text-xs text-zinc-500">
        Move to a specific beat inside the loop and pause playback. Static View renders a full-loop still trace for
        screenshots.
      </p>
    </div>
  </details>
</template>
