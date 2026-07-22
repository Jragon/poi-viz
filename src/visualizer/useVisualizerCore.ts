import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter
} from "vue";

import {
  createTransport,
  type TransportController,
  type TransportOptions
} from "@/composables/useTransport";
import type {
  CartesianMultiRigPose,
  MultiRigSequence,
  RigId,
  WorldMultiRigPose
} from "@/engine/types";
import type { MultiRigTrailSamples } from "@/visualizer/useMultiRigPlayback";
import {
  useVisualizerSession,
  type VisualizerSession,
  type VisualizerSessionOptions
} from "@/visualizer/useVisualizerSession";

export interface VisualizerCoreOptions extends VisualizerSessionOptions {
  readonly transport?: TransportController;
  readonly transportOptions?: TransportOptions;
  readonly autoDispose?: boolean;
}

export interface VisualizerCoreController {
  readonly sequence: ComputedRef<MultiRigSequence>;
  readonly transport: TransportController;
  readonly session: VisualizerSession;
  readonly rigOrder: ComputedRef<RigId[]>;
  readonly rawWorldPoses: ComputedRef<WorldMultiRigPose>;
  readonly worldPoses: ComputedRef<WorldMultiRigPose>;
  readonly cartesianPoses: ComputedRef<CartesianMultiRigPose>;
  readonly trails: ComputedRef<MultiRigTrailSamples>;
  readonly sceneWorldRadius: ComputedRef<number>;
  readonly transportDurationLabel: ComputedRef<string>;
  readonly sequenceSummary: ComputedRef<string>;
  readonly errorMessage: ComputedRef<string | null>;
  readonly isReady: ComputedRef<boolean>;
  readonly ownsTransport: boolean;
  dispose: () => void;
}

export function useVisualizerCore(
  sequence: MaybeRefOrGetter<MultiRigSequence>,
  options: VisualizerCoreOptions = {}
): VisualizerCoreController {
  const sequenceRef = computed(() => toValue(sequence));
  const ownsTransport = !options.transport;
  const transport = options.transport ?? createTransport(options.transportOptions);
  const instance = getCurrentInstance();

  const sessionOptions: VisualizerSessionOptions = {
    ...(options.autoplay !== undefined ? { autoplay: options.autoplay } : {}),
    ...(options.resumeOnSequenceChange !== undefined
      ? { resumeOnSequenceChange: options.resumeOnSequenceChange }
      : {})
  };
  const session = useVisualizerSession(() => sequenceRef.value, transport, sessionOptions);
  const { currentFrame, currentTrails, playback, errorMessage, isReady } = session;

  const rigOrder = computed(() => sequenceRef.value.rigs.map((rig) => rig.rigId));
  const rawWorldPoses = computed<WorldMultiRigPose>(() =>
    currentFrame.value?.ok ? currentFrame.value.rawWorldPoses : {}
  );
  const worldPoses = computed<WorldMultiRigPose>(() =>
    currentFrame.value?.ok ? currentFrame.value.worldPoses : {}
  );
  const cartesianPoses = computed<CartesianMultiRigPose>(() =>
    currentFrame.value?.ok ? currentFrame.value.cartesianPoses : {}
  );
  const trails = currentTrails;
  const sceneWorldRadius = computed(() => {
    const prepared = playback.prepared.value;
    const sideDepth = Math.max(
      session.planeSideADepthWorld.value,
      session.planeSideBDepthWorld.value
    );
    if (!prepared) {
      return 2 + sideDepth;
    }

    const sequenceRadius = prepared.rigs.reduce((maxRadius, rig) => {
      const rigMaxRadius = rig.prepared.segments.reduce((maxSegmentRadius, segment) => {
        const chainRadius = segment.hand.startPose.radius + segment.head.startPose.radius;
        return Math.max(maxSegmentRadius, chainRadius);
      }, 0);

      return Math.max(maxRadius, rigMaxRadius);
    }, 2);

    return sequenceRadius + sideDepth;
  });
  const transportDurationLabel = computed(() => transport.duration.value.toFixed(2));
  const sequenceSummary = computed(() =>
    sequenceRef.value.rigs.map((rig) => `${rig.rigId}:${rig.sequence.segments.length}`).join(", ")
  );

  let disposed = false;
  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    session.dispose();
    if (ownsTransport) {
      transport.dispose();
    }
  };

  if (instance && options.autoDispose !== false) {
    onBeforeUnmount(dispose);
  }

  return {
    sequence: sequenceRef,
    transport,
    session,
    rigOrder,
    rawWorldPoses,
    worldPoses,
    cartesianPoses,
    trails,
    sceneWorldRadius,
    transportDurationLabel,
    sequenceSummary,
    errorMessage,
    isReady,
    ownsTransport,
    dispose
  };
}
