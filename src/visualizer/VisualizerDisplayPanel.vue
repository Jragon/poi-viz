<script setup lang="ts">
import { computed } from "vue";

import FrameStableSelect from "@/components/FrameStableSelect.vue";
import type { ProjectionModePreference } from "@/engine/planeProjection";
import {
  DISPLAY_SCALE_SETTING,
  EXTERNAL_DISPLAY_SETTINGS,
  OVERLAY_GEOMETRY_SETTINGS,
  OVERLAY_VISIBILITY_SETTINGS,
  RIG_COLOR_SETTINGS,
  type RangeSettingRegistryEntry
} from "@/visualizer/useDisplaySettings";
import type { TrailLoopMode } from "@/visualizer/useMultiRigPlayback";
import { useVisualizerWorkspace } from "@/visualizer/visualizerWorkspace";

const PROJECTION_MODE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "orthographic", label: "Flat" },
  { value: "tilted", label: "Tilted" }
] as const;

const props = withDefaults(
  defineProps<{
    showHeader?: boolean;
    framed?: boolean;
  }>(),
  {
    showHeader: true,
    framed: true
  }
);

const { display } = useVisualizerWorkspace();

const activePresetLabel = computed(() =>
  display.activePresetId.value === "webcam" ? "Webcam" : "Normal"
);
const trailDecaySetting = EXTERNAL_DISPLAY_SETTINGS.find(
  (setting) => setting.id === "trailDecaySteps"
) as RangeSettingRegistryEntry;
const projectionYawSetting = EXTERNAL_DISPLAY_SETTINGS.find(
  (setting) => setting.id === "projectionYawDeg"
) as RangeSettingRegistryEntry;
const projectionPitchSetting = EXTERNAL_DISPLAY_SETTINGS.find(
  (setting) => setting.id === "projectionPitchDeg"
) as RangeSettingRegistryEntry;
const planeSideSeparationSetting = EXTERNAL_DISPLAY_SETTINGS.find(
  (setting) => setting.id === "planeSideSeparationWorld"
) as RangeSettingRegistryEntry;
const transportSpeedSetting = EXTERNAL_DISPLAY_SETTINGS.find(
  (setting) => setting.id === "transportSecondsPerUnit"
) as RangeSettingRegistryEntry;
const trailLoopEnabled = computed(() => display.external.trailLoopMode?.value.value === "auto");

function numberValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

function checkboxValue(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function trailLoopModeValue(event: Event): TrailLoopMode {
  return checkboxValue(event) ? "auto" : "off";
}

function projectionModeValue(value: string | number): ProjectionModePreference {
  return value === "orthographic" || value === "tilted" ? value : "auto";
}
</script>

<template>
  <aside
    :class="[
      'max-h-full overflow-y-auto p-4',
      props.framed
        ? 'rounded-2xl border border-ui-border bg-ui-surface-raised shadow-2xl shadow-slate-950/60 backdrop-blur'
        : ''
    ]"
  >
    <div class="grid gap-4">
      <div v-if="props.showHeader" class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Display</p>
          <p class="mt-1 font-mono text-sm text-ui-text-secondary">{{ activePresetLabel }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-ui-border-strong bg-ui-surface px-3 py-1.5 text-sm font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text"
          @click="display.closePanel()"
        >
          Close
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium transition"
          :class="
            display.activePresetId.value === 'normal'
              ? 'border-amber-400 bg-amber-400 text-slate-950'
              : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary'
          "
          :aria-pressed="display.activePresetId.value === 'normal'"
          :disabled="display.isWebcamPresetForced.value"
        >
          Normal
        </button>
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium transition"
          :class="
            display.activePresetId.value === 'webcam'
              ? 'border-sky-400 bg-sky-400 text-slate-950'
              : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary'
          "
          :aria-pressed="display.activePresetId.value === 'webcam'"
          disabled
        >
          Webcam
        </button>
      </div>

      <button
        type="button"
        class="rounded-lg border border-ui-border-strong bg-ui-surface px-4 py-2 text-sm font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text"
        @click="display.resetActivePreset()"
      >
        Reset {{ activePresetLabel }}
      </button>

      <label class="grid gap-2 text-sm font-medium uppercase tracking-[0.14em] text-ui-text-muted">
        <span class="flex items-center justify-between gap-3">
          <span>{{ DISPLAY_SCALE_SETTING.label }}</span>
          <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
            {{ display.displayScale.value.toFixed(DISPLAY_SCALE_SETTING.digits) }}x
          </span>
        </span>
        <input
          type="range"
          :min="DISPLAY_SCALE_SETTING.min"
          :max="DISPLAY_SCALE_SETTING.max"
          :step="DISPLAY_SCALE_SETTING.step"
          :value="display.displayScale.value"
          class="w-full accent-amber-400"
          @input="display.setDisplayScale(numberValue($event))"
        />
      </label>

      <fieldset class="grid gap-3 border-t border-ui-border-subtle pt-4">
        <legend class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">
          Layers
        </legend>
        <div
          class="grid gap-2 text-sm text-ui-text-secondary sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
        >
          <label
            v-for="control in OVERLAY_VISIBILITY_SETTINGS"
            :key="control.key"
            class="flex items-center gap-2"
          >
            <input
              type="checkbox"
              :checked="display.overlaySettings.value.visibility[control.key]"
              class="accent-amber-400"
              @change="display.setOverlayVisibility(control.key, checkboxValue($event))"
            />
            {{ control.label }}
          </label>
          <label v-if="display.external.trailLoopMode" class="flex items-center gap-2">
            <input
              type="checkbox"
              :checked="trailLoopEnabled"
              class="accent-amber-400"
              @change="display.external.trailLoopMode.set(trailLoopModeValue($event))"
            />
            Loop Continuous Trails
          </label>
        </div>
      </fieldset>

      <div
        v-if="display.external.trailDecaySteps || display.external.transportSecondsPerUnit"
        class="grid gap-3 border-t border-ui-border-subtle pt-4"
      >
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Session</p>
        <label
          v-if="display.external.trailDecaySteps"
          class="grid gap-2 text-xs uppercase tracking-[0.16em] text-ui-text-muted"
        >
          <span class="flex items-center justify-between gap-3">
            <span>{{ trailDecaySetting.label }}</span>
            <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
              {{ display.external.trailDecaySteps.value.value.toFixed(trailDecaySetting.digits) }}
            </span>
          </span>
          <input
            type="range"
            :min="trailDecaySetting.min"
            :max="trailDecaySetting.max"
            :step="trailDecaySetting.step"
            :value="display.external.trailDecaySteps.value.value"
            class="w-full accent-fuchsia-400"
            @input="display.external.trailDecaySteps.set(numberValue($event))"
          />
        </label>

        <label
          v-if="display.external.transportSecondsPerUnit"
          class="grid gap-2 text-xs uppercase tracking-[0.16em] text-ui-text-muted"
        >
          <span class="flex items-center justify-between gap-3">
            <span>{{ transportSpeedSetting.label }}</span>
            <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
              {{
                display.external.transportSecondsPerUnit.value.value.toFixed(
                  transportSpeedSetting.digits
                )
              }}s
            </span>
          </span>
          <input
            type="range"
            :min="transportSpeedSetting.min"
            :max="transportSpeedSetting.max"
            :step="transportSpeedSetting.step"
            :value="display.external.transportSecondsPerUnit.value.value"
            class="w-full accent-fuchsia-400"
            @input="display.external.transportSecondsPerUnit.set(numberValue($event))"
          />
        </label>
      </div>

      <div
        v-if="
          display.external.projectionMode ||
          display.external.projectionYawDeg ||
          display.external.projectionPitchDeg ||
          display.external.planeSideSeparationWorld
        "
        class="grid gap-3 border-t border-ui-border-subtle pt-4"
      >
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Projection</p>
        <label
          v-if="display.external.projectionMode"
          class="grid gap-2 text-sm text-ui-text-secondary"
        >
          <span class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted"
            >Mode</span
          >
          <FrameStableSelect
            class="w-full rounded-lg border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-amber-400"
            :model-value="display.external.projectionMode.value.value"
            :options="PROJECTION_MODE_OPTIONS"
            @update:model-value="
              display.external.projectionMode.set(projectionModeValue($event))
            "
          />
        </label>

        <label
          v-if="display.external.projectionYawDeg"
          class="grid gap-2 text-xs uppercase tracking-[0.16em] text-ui-text-muted"
        >
          <span class="flex items-center justify-between gap-3">
            <span>{{ projectionYawSetting.label }}</span>
            <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
              {{
                display.external.projectionYawDeg.value.value.toFixed(projectionYawSetting.digits)
              }}deg
            </span>
          </span>
          <input
            type="range"
            :min="projectionYawSetting.min"
            :max="projectionYawSetting.max"
            :step="projectionYawSetting.step"
            :value="display.external.projectionYawDeg.value.value"
            class="w-full accent-fuchsia-400"
            @input="display.external.projectionYawDeg.set(numberValue($event))"
          />
        </label>

        <label
          v-if="display.external.projectionPitchDeg"
          class="grid gap-2 text-xs uppercase tracking-[0.16em] text-ui-text-muted"
        >
          <span class="flex items-center justify-between gap-3">
            <span>{{ projectionPitchSetting.label }}</span>
            <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
              {{
                display.external.projectionPitchDeg.value.value.toFixed(
                  projectionPitchSetting.digits
                )
              }}deg
            </span>
          </span>
          <input
            type="range"
            :min="projectionPitchSetting.min"
            :max="projectionPitchSetting.max"
            :step="projectionPitchSetting.step"
            :value="display.external.projectionPitchDeg.value.value"
            class="w-full accent-fuchsia-400"
            @input="display.external.projectionPitchDeg.set(numberValue($event))"
          />
        </label>

        <label
          v-if="display.external.planeSideSeparationWorld"
          class="grid gap-2 text-xs uppercase tracking-[0.16em] text-ui-text-muted"
        >
          <span class="flex items-center justify-between gap-3">
            <span>{{ planeSideSeparationSetting.label }}</span>
            <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
              {{
                display.external.planeSideSeparationWorld.value.value.toFixed(
                  planeSideSeparationSetting.digits
                )
              }}u
            </span>
          </span>
          <input
            type="range"
            :min="planeSideSeparationSetting.min"
            :max="planeSideSeparationSetting.max"
            :step="planeSideSeparationSetting.step"
            :value="display.external.planeSideSeparationWorld.value.value"
            class="w-full accent-fuchsia-400"
            @input="display.external.planeSideSeparationWorld.set(numberValue($event))"
          />
        </label>
      </div>

      <div class="grid gap-3 border-t border-ui-border-subtle pt-4">
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Geometry</p>
        <label
          v-for="control in OVERLAY_GEOMETRY_SETTINGS"
          :key="control.key"
          class="grid gap-2 text-xs uppercase tracking-[0.16em] text-ui-text-muted"
        >
          <span class="flex items-center justify-between gap-3">
            <span>{{ control.label }}</span>
            <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
              {{ display.overlaySettings.value.geometry[control.key].toFixed(control.digits) }}
            </span>
          </span>
          <input
            type="range"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            :value="display.overlaySettings.value.geometry[control.key]"
            class="w-full accent-amber-400"
            @input="display.setOverlayGeometry(control.key, numberValue($event))"
          />
        </label>
      </div>

      <div class="grid gap-4 border-t border-ui-border-subtle pt-4">
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Rig Colors</p>
        <section v-for="rigId in display.rigOrder.value" :key="rigId" class="grid gap-3">
          <p class="font-mono text-sm text-ui-text-secondary">{{ rigId }}</p>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label
              v-for="control in RIG_COLOR_SETTINGS"
              :key="`${rigId}-${control.key}`"
              class="flex items-center justify-between gap-3 text-sm text-ui-text-secondary"
            >
              <span>{{ control.label }}</span>
              <input
                type="color"
                :value="display.overlaySettings.value.rigStyles[rigId]?.[control.key]"
                class="h-8 w-12 cursor-pointer rounded border border-ui-border-strong bg-transparent p-0"
                @input="display.setRigOverlayStyle(rigId, control.key, inputValue($event))"
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  </aside>
</template>
