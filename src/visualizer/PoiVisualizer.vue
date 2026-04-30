<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { createTransport, provideTransport } from "@/composables/useTransport";
import type { MultiRigSequence } from "@/engine/types";
import { demoSequence } from "@/visualizer/demoSequence";
import { createPngSequenceExporter } from "@/visualizer/exportPngSequence";
import MetronomeControls from "@/visualizer/MetronomeControls.vue";
import { cloneOverlaySettings } from "@/visualizer/overlaySettings";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import TransportControls from "@/visualizer/TransportControls.vue";
import {
  createDisplaySettingsController,
  provideDisplaySettings
} from "@/visualizer/useDisplaySettings";
import { usePhaseMetronome } from "@/visualizer/usePhaseMetronome";
import { useVisualizerSession } from "@/visualizer/useVisualizerSession";
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

const props = withDefaults(
  defineProps<{
    sequence?: MultiRigSequence;
  }>(),
  {
    sequence: () => demoSequence
  }
);

const transport = provideTransport(createTransport());
const session = useVisualizerSession(() => props.sequence, transport, {
  autoplay: true,
  resumeOnSequenceChange: true
});
const metronome = usePhaseMetronome({
  currentFrame: session.currentFrame,
  prepared: session.playback.prepared,
  currentTime: transport.currentTime,
  duration: transport.duration,
  isPlaying: transport.isPlaying,
  speed: transport.speed,
  unitsPerSecond: transport.unitsPerSecond,
  onRuleAdded: () => {
    transport.reset();
  }
});
const webcam = useWebcam();
const fullscreenTargetRef = ref<HTMLElement | null>(null);
const viewportRef = ref<CanvasViewportExposed | null>(null);
const isFullscreen = ref(false);
const pngSequenceExporter = createPngSequenceExporter();
const webcamActive = computed(() => webcam.isActive.value);
const webcamStream = computed(() => webcam.stream.value);
const webcamErrorMessage = computed(() => webcam.errorMessage.value);
let fullscreenAnimationFrame = 0;

const rigOrder = computed(() => props.sequence.rigs.map((rig) => rig.rigId));
const transportSecondsPerUnit = computed({
  get: () => 1 / transport.speed.value,
  set: (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    transport.setSpeed(1 / value);
  }
});
const displaySettings = provideDisplaySettings(
  createDisplaySettingsController({
    rigOrder,
    external: {
      trailDecaySteps: {
        value: session.trailDecaySteps,
        set: session.setTrailDecaySteps
      },
      trailLoopMode: {
        value: session.trailLoopMode,
        set: session.setTrailLoopMode
      },
      transportSecondsPerUnit: {
        value: transportSecondsPerUnit,
        set: (value) => {
          transportSecondsPerUnit.value = value;
        }
      }
    }
  })
);
const errorMessage = session.errorMessage;
const cartesianPoses = computed(() =>
  session.currentFrame.value?.ok ? session.currentFrame.value.cartesianPoses : {}
);
const trails = computed(() => session.currentTrails.value);
const transportDurationLabel = computed(() => transport.duration.value.toFixed(2));
const metronomeRules = computed(() => metronome.rules.value);
const metronomeRigIds = computed(() => metronome.rigIds.value);
const metronomeAudioEnabled = computed(() => metronome.isAudioEnabled.value);
const metronomeAudioErrorMessage = computed(() => metronome.audioErrorMessage.value);
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
const sequenceSummary = computed(() =>
  props.sequence.rigs.map((rig) => `${rig.rigId}:${rig.sequence.segments.length}`).join(", ")
);

watch(webcamActive, (active) => displaySettings.setWebcamActive(active), { immediate: true });

watch(
  () => displaySettings.panelOpen.value,
  () => {
    nextTick(() => {
      scheduleViewportRecompute();
    });
  }
);

onBeforeUnmount(() => {
  if (fullscreenAnimationFrame) {
    cancelAnimationFrame(fullscreenAnimationFrame);
  }

  session.dispose();
  metronome.dispose();
  transport.dispose();
  pngSequenceExporter.cancel();
});

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
  if (webcam.isActive.value) {
    webcam.stop();
    return;
  }

  await webcam.start();
}

async function startPngSequenceExport() {
  const wasPlaying = transport.isPlaying.value;
  transport.pause();

  try {
    await pngSequenceExporter.start({
      sequence: props.sequence,
      sequenceSummary: sequenceSummary.value,
      rigOrder: rigOrder.value,
      sceneWorldRadius: sceneWorldRadius.value,
      displayScale: displaySettings.displayScale.value,
      trailDecaySteps: session.trailDecaySteps.value,
      trailLoopMode: session.trailLoopMode.value,
      overlaySettings: cloneOverlaySettings(displaySettings.overlaySettings.value)
    });
  } finally {
    if (wasPlaying) {
      transport.play();
    }
  }
}

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", syncFullscreenState);
  document.removeEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
});
</script>

<template>
  <section
    :class="[
      'mx-auto grid w-full gap-4',
      displaySettings.panelOpen.value && !isFullscreen
        ? 'lg:w-380 lg:max-w-none lg:grid-cols-[72rem_22rem] lg:items-start'
        : 'lg:max-w-6xl'
    ]"
  >
    <div class="grid min-w-0 gap-4">
      <TransportControls />

      <div
        ref="fullscreenTargetRef"
        :class="['grid gap-4', isFullscreen ? 'bg-slate-950 p-4 md:p-6' : '']"
      >
        <VisualizerControls
          :active-preset-id="displaySettings.activePresetId.value"
          :export-state="pngSequenceExporter.state"
          :is-display-panel-open="displaySettings.panelOpen.value"
          :is-export-ready="session.isReady.value"
          :is-fullscreen="isFullscreen"
          :is-webcam-active="webcamActive"
          :webcam-error-message="webcamErrorMessage"
          @start-export="startPngSequenceExport"
          @cancel-export="pngSequenceExporter.cancel()"
          @toggle-display-panel="displaySettings.togglePanel()"
          @toggle-fullscreen="toggleFullscreen"
          @toggle-webcam="toggleWebcam"
        />

        <div class="relative grid gap-4">
          <div
            v-if="errorMessage"
            class="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-100"
          >
            <p class="text-xs uppercase tracking-[0.24em] text-rose-300">Visualizer Error</p>
            <p class="mt-3">{{ errorMessage }}</p>
          </div>

          <PoiCanvasViewport
            v-else
            ref="viewportRef"
            :display-scale="displaySettings.displayScale.value"
            :is-fullscreen="isFullscreen"
            :overlay-settings="displaySettings.overlaySettings.value"
            :poses="cartesianPoses"
            :rig-order="rigOrder"
            :scene-world-radius="sceneWorldRadius"
            :trails="trails"
            :webcam-active="webcamActive"
            :webcam-stream="webcamStream"
          />

          <VisualizerDisplayPanel
            v-if="displaySettings.panelOpen.value"
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
        @add-rule="metronome.addRule()"
        @remove-rule="metronome.removeRule($event)"
        @update-rule="(ruleId, nextRule) => metronome.updateRule(ruleId, nextRule)"
        @set-audio-enabled="metronome.setAudioEnabled($event)"
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

    <VisualizerDisplayPanel
      v-if="displaySettings.panelOpen.value && !isFullscreen"
      class="hidden max-h-[calc(100vh-7rem)] lg:block"
    />
  </section>
</template>
