<script setup lang="ts">
import FloatingPanel from "@/components/FloatingPanel.vue";

import { DEFAULT_FIRE_POI_SETTINGS, type FirePoiSettings } from "./firePoiSettings";
import { mergeFirePoiSettingsPatch } from "./firePoiSettingsState";

const props = defineProps<{
  settings: FirePoiSettings;
}>();

const emit = defineEmits<{
  close: [];
  updateSettings: [FirePoiSettings];
}>();

function patchSettings(patch: Partial<FirePoiSettings>) {
  emit("updateSettings", mergeFirePoiSettingsPatch(props.settings, patch));
}

function resetDefaults() {
  emit("updateSettings", DEFAULT_FIRE_POI_SETTINGS);
}
</script>

<template>
  <FloatingPanel storage-key="poi-v2:three-d-debug-fire-poi-panel" @close="emit('close')">
    <template #handle="{ close, resetPosition }">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Fire Poi</p>
          <p class="mt-1 text-sm text-slate-300">Deterministic lab overlay</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            @click.stop="resetPosition"
          >
            Reset Position
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            @click.stop="close"
          >
            Close
          </button>
        </div>
      </div>
    </template>

    <div class="grid gap-4 p-4 text-sm text-slate-300">
      <label
        class="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
      >
        <span>Enabled</span>
        <input
          :checked="settings.enabled"
          type="checkbox"
          class="h-4 w-4 accent-orange-400"
          @change="patchSettings({ enabled: ($event.target as HTMLInputElement).checked })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Core Intensity</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.coreIntensity.toFixed(2) }}</span>
        </span>
        <input
          :value="settings.coreIntensity"
          type="range"
          min="0.5"
          max="4"
          step="0.05"
          class="w-full accent-orange-400"
          @input="patchSettings({ coreIntensity: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Core Radius</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.coreRadius.toFixed(2) }}</span>
        </span>
        <input
          :value="settings.coreRadius"
          type="range"
          min="0.04"
          max="0.40"
          step="0.01"
          class="w-full accent-orange-400"
          @input="patchSettings({ coreRadius: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Wake Length</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.wakeLengthSteps }}</span>
        </span>
        <input
          :value="settings.wakeLengthSteps"
          type="range"
          min="4"
          max="48"
          step="1"
          class="w-full accent-orange-400"
          @input="patchSettings({ wakeLengthSteps: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Emission Density</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.emissionDensity }}</span>
        </span>
        <input
          :value="settings.emissionDensity"
          type="range"
          min="1"
          max="20"
          step="1"
          class="w-full accent-orange-400"
          @input="patchSettings({ emissionDensity: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Turbulence</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.turbulence.toFixed(2) }}</span>
        </span>
        <input
          :value="settings.turbulence"
          type="range"
          min="0"
          max="0.6"
          step="0.01"
          class="w-full accent-orange-400"
          @input="patchSettings({ turbulence: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Spread</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.spread.toFixed(2) }}</span>
        </span>
        <input
          :value="settings.spread"
          type="range"
          min="0.02"
          max="0.4"
          step="0.01"
          class="w-full accent-orange-400"
          @input="patchSettings({ spread: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Fade Rate</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.fadeRate.toFixed(2) }}</span>
        </span>
        <input
          :value="settings.fadeRate"
          type="range"
          min="0.4"
          max="3"
          step="0.05"
          class="w-full accent-orange-400"
          @input="patchSettings({ fadeRate: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="grid gap-2">
        <span class="flex items-center justify-between gap-3">
          <span>Velocity Stretch</span>
          <span class="font-mono text-xs text-slate-500">{{ settings.velocityStretch.toFixed(2) }}</span>
        </span>
        <input
          :value="settings.velocityStretch"
          type="range"
          min="0.5"
          max="3"
          step="0.05"
          class="w-full accent-orange-400"
          @input="patchSettings({ velocityStretch: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <button
        type="button"
        class="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
        @click="resetDefaults"
      >
        Reset Defaults
      </button>
    </div>
  </FloatingPanel>
</template>