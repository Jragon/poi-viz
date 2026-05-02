<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { useAuthoringLibrary } from "@/authoring/useAuthoringLibrary";
import FloatingPanel from "@/components/FloatingPanel.vue";
import DocumentSelector from "@/pages/components/DocumentSelector.vue";
import { useVisualizerDocumentSource } from "@/pages/useVisualizerDocumentSource";
import { demoSequence } from "@/visualizer/demoSequence";
import MetronomeControls from "@/visualizer/MetronomeControls.vue";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import TransportControls from "@/visualizer/TransportControls.vue";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";
import { useVisualizerDisplay } from "@/visualizer/useVisualizerDisplay";
import { useVisualizerExport } from "@/visualizer/useVisualizerExport";
import { useVisualizerMetronome } from "@/visualizer/useVisualizerMetronome";
import { useWebcam } from "@/visualizer/useWebcam";
import VisualizerControls from "@/visualizer/VisualizerControls.vue";
import VisualizerDisplayPanel from "@/visualizer/VisualizerDisplayPanel.vue";

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type WebkitDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type CanvasViewportExposed = {
  recomputeLayout: () => void;
};

const library = useAuthoringLibrary();
const {
  documents,
  selectedId,
  sequence: selectedSequence,
  select: selectDocument
} = useVisualizerDocumentSource(library);
const activeSequence = computed(() => selectedSequence.value ?? demoSequence);
const core = useVisualizerCore(activeSequence, {
  autoplay: true,
  resumeOnSequenceChange: true
});
const {
  rigOrder,
  cartesianPoses,
  trails,
  sceneWorldRadius,
  transportDurationLabel,
  errorMessage: visualizerErrorMessage,
  isReady: visualizerReady
} = core;
const displaySettings = useVisualizerDisplay(core);
const {
  activePresetId,
  panelOpen,
  displayScale,
  overlaySettings,
  setWebcamActive,
  togglePanel,
  closePanel
} = displaySettings;
const {
  state: pngSequenceExportState,
  start: startPngSequenceExport,
  cancel: cancelPngSequenceExport
} = useVisualizerExport(core, displaySettings);
const {
  isActive: webcamActive,
  stream: webcamStream,
  errorMessage: webcamErrorMessage,
  start: startWebcam,
  stop: stopWebcam
} = useWebcam();
const {
  rules: metronomeRules,
  rigIds: metronomeRigIds,
  isAudioEnabled: metronomeAudioEnabled,
  audioErrorMessage: metronomeAudioErrorMessage,
  addRule: addMetronomeRule,
  removeRule: removeMetronomeRule,
  updateRule: updateMetronomeRule,
  setAudioEnabled: setMetronomeAudioEnabled
} = useVisualizerMetronome(core);

const fullscreenTargetRef = ref<HTMLElement | null>(null);
const viewportRef = ref<CanvasViewportExposed | null>(null);
const isFullscreen = ref(false);
const projectionDrag = computed(() => ({
  mode: core.session.projectionSettings.value.mode,
  yawDeg: core.session.projectionYawDeg.value,
  pitchDeg: core.session.projectionPitchDeg.value
}));

let fullscreenAnimationFrame = 0;

watch(webcamActive, (active) => setWebcamActive(active), { immediate: true });

watch(
  () => panelOpen.value,
  () => {
    nextTick(() => {
      scheduleViewportRecompute();
    });
  }
);

function scheduleViewportRecompute() {
  if (fullscreenAnimationFrame) {
    cancelAnimationFrame(fullscreenAnimationFrame);
  }

  fullscreenAnimationFrame = requestAnimationFrame(() => {
    viewportRef.value?.recomputeLayout();
    fullscreenAnimationFrame = 0;
  });
}

function syncFullscreenState() {
  const documentWithWebkit = document as WebkitDocument;
  isFullscreen.value =
    document.fullscreenElement === fullscreenTargetRef.value ||
    documentWithWebkit.webkitFullscreenElement === fullscreenTargetRef.value;

  nextTick(() => {
    scheduleViewportRecompute();
  });
}

onMounted(() => {
  document.addEventListener("fullscreenchange", syncFullscreenState);
  document.addEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
});

onBeforeUnmount(() => {
  if (fullscreenAnimationFrame) {
    cancelAnimationFrame(fullscreenAnimationFrame);
  }

  document.removeEventListener("fullscreenchange", syncFullscreenState);
  document.removeEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
});

async function toggleFullscreen() {
  const target = fullscreenTargetRef.value as FullscreenCapableElement | null;
  const documentWithWebkit = document as WebkitDocument;

  if (!target) {
    return;
  }

  if (
    document.fullscreenElement === target ||
    documentWithWebkit.webkitFullscreenElement === target
  ) {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }

    await documentWithWebkit.webkitExitFullscreen?.();
    return;
  }

  if (target.requestFullscreen) {
    await target.requestFullscreen();
    return;
  }

  await target.webkitRequestFullscreen?.();
}

async function toggleWebcam() {
  if (webcamActive.value) {
    stopWebcam();
    return;
  }

  await startWebcam();
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
    <template v-if="selectedSequence">
      <div class="w-full">
        <DocumentSelector
          :documents="documents"
          :selected-id="selectedId"
          @select="selectDocument($event)"
        />
      </div>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:p-6">
        <div class="grid gap-4">
          <TransportControls />

          <div
            ref="fullscreenTargetRef"
            :class="['grid gap-4', isFullscreen ? 'bg-slate-950 p-4 md:p-6' : '']"
          >
            <VisualizerControls
              :active-preset-id="activePresetId"
              :export-state="pngSequenceExportState"
              :is-display-panel-open="panelOpen"
              :is-export-ready="visualizerReady"
              :is-fullscreen="isFullscreen"
              :is-webcam-active="webcamActive"
              :webcam-error-message="webcamErrorMessage"
              @start-export="startPngSequenceExport()"
              @cancel-export="cancelPngSequenceExport()"
              @toggle-display-panel="togglePanel()"
              @toggle-fullscreen="toggleFullscreen"
              @toggle-webcam="toggleWebcam"
            />

            <div class="relative grid gap-4">
              <div
                v-if="visualizerErrorMessage"
                class="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-100"
              >
                <p class="text-xs uppercase tracking-[0.24em] text-rose-300">Visualizer Error</p>
                <p class="mt-3">{{ visualizerErrorMessage }}</p>
              </div>

              <PoiCanvasViewport
                v-else
                ref="viewportRef"
                :display-scale="displayScale"
                :is-fullscreen="isFullscreen"
                :overlay-settings="overlaySettings"
                :poses="cartesianPoses"
                :projection-drag="projectionDrag"
                :rig-order="rigOrder"
                :scene-world-radius="sceneWorldRadius"
                :trails="trails"
                :webcam-active="webcamActive"
                :webcam-stream="webcamStream"
                @update:projection-yaw-deg="core.session.setProjectionYawDeg"
                @update:projection-pitch-deg="core.session.setProjectionPitchDeg"
              />

              <VisualizerDisplayPanel
                v-if="panelOpen"
                :class="[
                  'absolute z-30',
                  isFullscreen
                    ? 'bottom-4 right-4 top-4 w-[min(24rem,calc(100%-2rem))]'
                    : 'bottom-3 right-3 top-3 w-[min(24rem,calc(100%-1.5rem))] lg:hidden'
                ]"
              />
            </div>
          </div>

          <MetronomeControls
            v-if="!isFullscreen"
            :rules="metronomeRules"
            :rig-ids="metronomeRigIds"
            :is-audio-enabled="metronomeAudioEnabled"
            :audio-error-message="metronomeAudioErrorMessage"
            @add-rule="addMetronomeRule()"
            @remove-rule="removeMetronomeRule($event)"
            @update-rule="(ruleId, nextRule) => updateMetronomeRule(ruleId, nextRule)"
            @set-audio-enabled="setMetronomeAudioEnabled($event)"
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
        </div>
      </section>

      <FloatingPanel
        v-if="panelOpen && !isFullscreen"
        storage-key="poi-v2:display-panel-position"
        class="hidden lg:flex"
        @close="closePanel()"
      >
        <template #handle="{ close, resetPosition }">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Display</p>
              <p class="mt-1 font-mono text-sm text-slate-300">
                {{ activePresetId }}
              </p>
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

        <VisualizerDisplayPanel :show-header="false" :framed="false" />
      </FloatingPanel>
    </template>

    <section
      v-else
      class="mx-auto w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400"
    >
      <p>No saved documents.</p>
      <router-link
        to="/authoring"
        class="mt-3 inline-block rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
      >
        Create one in the editor
      </router-link>
    </section>
  </main>
</template>
