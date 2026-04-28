<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import { createTransport, provideTransport } from "@/composables/useTransport";
import type { MultiRigSequence, RigId } from "@/engine/types";
import { demoSequence } from "@/visualizer/demoSequence";
import { createPngSequenceExporter } from "@/visualizer/exportPngSequence";
import MetronomeControls from "@/visualizer/MetronomeControls.vue";
import {
  cloneOverlaySettings,
  createDefaultOverlaySettings,
  resetOverlaySettings,
  syncOverlayRigStyles,
  type OverlayGeometryKey,
  type OverlayLayerVisibility,
  type RigOverlayStyleKey
} from "@/visualizer/overlaySettings";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import TransportControls from "@/visualizer/TransportControls.vue";
import { usePhaseMetronome } from "@/visualizer/usePhaseMetronome";
import { useVisualizerSession } from "@/visualizer/useVisualizerSession";
import { useWebcam } from "@/visualizer/useWebcam";
import VisualizerControls from "@/visualizer/VisualizerControls.vue";

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
const displayScale = ref(1);
const isFullscreen = ref(false);
const pngSequenceExporter = createPngSequenceExporter();
const webcamActive = computed(() => webcam.isActive.value);
const webcamStream = computed(() => webcam.stream.value);
const webcamErrorMessage = computed(() => webcam.errorMessage.value);
let fullscreenAnimationFrame = 0;

const rigOrder = computed(() => props.sequence.rigs.map((rig) => rig.rigId));
const overlaySettings = reactive(createDefaultOverlaySettings(rigOrder.value));
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

watch(
  rigOrder,
  (nextRigOrder) => {
    syncOverlayRigStyles(overlaySettings, nextRigOrder);
  },
  { immediate: true }
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

function resetDisplayScale() {
  displayScale.value = 1;
}

function updateOverlayVisibility(key: keyof OverlayLayerVisibility, value: boolean) {
  overlaySettings.visibility[key] = value;
}

function updateOverlayGeometry(key: OverlayGeometryKey, value: number) {
  overlaySettings.geometry[key] = value;
}

function updateRigOverlayStyle(rigId: RigId, key: RigOverlayStyleKey, value: string) {
  const style = overlaySettings.rigStyles[rigId];
  if (!style) {
    return;
  }

  style[key] = value;
}

function resetOverlayStyle() {
  resetOverlaySettings(overlaySettings, rigOrder.value);
}

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
      displayScale: displayScale.value,
      trailDecaySteps: session.trailDecaySteps.value,
      overlaySettings: cloneOverlaySettings(overlaySettings)
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
  <section class="grid gap-4">
    <TransportControls />

    <div
      ref="fullscreenTargetRef"
      :class="['grid gap-4', isFullscreen ? 'bg-slate-950 p-4 md:p-6' : '']"
    >
      <VisualizerControls
        v-model:display-scale="displayScale"
        :overlay-settings="overlaySettings"
        :rig-order="rigOrder"
        :export-state="pngSequenceExporter.state"
        :is-export-ready="session.isReady.value"
        :is-fullscreen="isFullscreen"
        :is-webcam-active="webcamActive"
        :webcam-error-message="webcamErrorMessage"
        @reset-scale="resetDisplayScale"
        @reset-overlay-style="resetOverlayStyle"
        @start-export="startPngSequenceExport"
        @cancel-export="pngSequenceExporter.cancel()"
        @toggle-fullscreen="toggleFullscreen"
        @toggle-webcam="toggleWebcam"
        @update-overlay-geometry="updateOverlayGeometry"
        @update-overlay-visibility="updateOverlayVisibility"
        @update-rig-overlay-style="updateRigOverlayStyle"
      />

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
        :display-scale="displayScale"
        :geometry="overlaySettings.geometry"
        :is-fullscreen="isFullscreen"
        :poses="cartesianPoses"
        :rig-styles="overlaySettings.rigStyles"
        :rig-order="rigOrder"
        :scene-world-radius="sceneWorldRadius"
        :show-chain-lines="overlaySettings.visibility.showChainLines"
        :show-hand-trails="overlaySettings.visibility.showHandTrails"
        :show-head-trails="overlaySettings.visibility.showHeadTrails"
        :show-node-markers="overlaySettings.visibility.showNodeMarkers"
        :trails="trails"
        :webcam-active="webcamActive"
        :webcam-stream="webcamStream"
      />
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
  </section>
</template>
