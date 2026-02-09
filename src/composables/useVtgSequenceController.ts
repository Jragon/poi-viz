import { normalizeLoopBeat } from "@/state/beatMath";
import type { AppState, HandState } from "@/types/state";
import { classifyVTG } from "@/vtg/classify";
import {
  computeSequenceBoundariesBeats,
  createDefaultVTGSequence,
  deriveSequenceArmDirectionBadges,
  deserializeVTGSequence,
  normalizeSequenceEventSnap,
  resolveSequenceContinuity,
  resolveSequencePlayheadBeats,
  sanitizeVTGSequence,
  serializeVTGSequence,
  snapDurationToArmPhaseEvents,
  toVTGDescriptor,
  VTG_SEQUENCE_DEFAULT_POI_HEAD_CYCLES_PER_ARM_CYCLE,
  VTG_SEQUENCE_DEFAULT_RIGHT_ARM_SIGN,
  type VTGArmSign,
  type VTGSequence,
  type VTGSequenceDescriptor,
  type VTGSequenceDirectionBadges,
  type VTGSequenceSegment,
  type VTGSequenceSnapSetting
} from "@/vtg/sequence";
import {
  VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT,
  type VTGDescriptor,
  type VTGPhaseDeg
} from "@/vtg/types";
import { computed, ref, watch, type ComputedRef, type Ref } from "vue";

const SEQUENCE_STATUS_RESET_DELAY_MS = 2400;
const SEQUENCE_DEFAULT_SEGMENT_DURATION_BEATS = 1;
const SEQUENCE_FILE_EXTENSION = ".json";
const SEQUENCE_FILE_FALLBACK_NAME = "vtg-sequence";
const SEQUENCE_ID_PREFIX = "seg";
const MIN_LOOP_BEATS = 0.25;
const RIGHT_ARM_SIGN_EPSILON = 1e-9;

type SequenceDirectionSign = VTGArmSign;

interface SequenceSnapshotFromState {
  descriptor: VTGSequenceDescriptor;
  startPhaseDeg: VTGPhaseDeg;
}

export interface SequenceSegmentView extends VTGSequenceSegment {
  armDirectionBadges: VTGSequenceDirectionBadges;
  poiDirectionFlipBlocked: boolean;
}

export interface VtgSequenceController {
  sequenceMode: Ref<boolean>;
  sequence: Ref<VTGSequence>;
  sequenceStatus: Ref<string>;
  selectedSegmentId: Ref<string | null>;
  selectedSegmentDescriptorForVtgPanel: ComputedRef<VTGDescriptor | null>;
  segmentViews: ComputedRef<SequenceSegmentView[]>;
  activeDirectionBadges: ComputedRef<VTGSequenceDirectionBadges | null>;
  renderState: ComputedRef<AppState>;
  renderBeat: ComputedRef<number>;
  transportLoopBeats: ComputedRef<number>;
  transportPlayheadBeats: ComputedRef<number>;
  trailResetEpoch: Ref<number>;
  handleSetSequenceMode: (enabled: boolean, state: AppState) => void;
  handleSetSequenceName: (name: string) => void;
  handleSetSequenceLoop: (loop: boolean) => void;
  handleSetSnapSetting: (snapSetting: VTGSequenceSnapSetting) => void;
  handleSetAllowPoiDirectionFlip: (allowPoiDirectionFlip: boolean) => void;
  handleSetSequenceStartPhaseDeg: (startPhaseDeg: VTGPhaseDeg) => void;
  handleSelectSegment: (segmentId: string) => void;
  handleAddSegmentFromCurrentState: (state: AppState) => void;
  handleReplaceSelectedDescriptor: (descriptor: VTGDescriptor) => void;
  handleSetSelectedDurationBeats: (durationBeats: number) => void;
  handleSetSelectedRightArmSign: (rightArmSign: VTGArmSign) => void;
  handleMoveSelectedSegment: (direction: "up" | "down") => void;
  handleDeleteSelectedSegment: () => void;
  handleDuplicateSelectedSegment: () => void;
  handleExportSequence: () => void;
  handleImportSequence: (file: File) => Promise<void>;
  dispose: () => void;
}

function downloadTextFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function sanitizeFileSegment(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createSequenceFileName(name: string): string {
  const sanitized = sanitizeFileSegment(name);
  const baseName = sanitized.length > 0 ? sanitized : SEQUENCE_FILE_FALLBACK_NAME;
  return `${baseName}${SEQUENCE_FILE_EXTENSION}`;
}

function resolveRightArmSign(speedRadiansPerBeat: number): VTGArmSign {
  return speedRadiansPerBeat < -RIGHT_ARM_SIGN_EPSILON ? -1 : 1;
}

function resolvePoiHeadCyclesPerArmCycle(rightHeadSpeedRadiansPerBeat: number, rightArmSign: VTGArmSign): number {
  const signedReferenceSpeed = rightArmSign * VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT;
  if (Math.abs(signedReferenceSpeed) <= RIGHT_ARM_SIGN_EPSILON) {
    return VTG_SEQUENCE_DEFAULT_POI_HEAD_CYCLES_PER_ARM_CYCLE;
  }

  const cycles = rightHeadSpeedRadiansPerBeat / signedReferenceSpeed;
  if (!Number.isFinite(cycles) || Math.abs(cycles) <= RIGHT_ARM_SIGN_EPSILON) {
    return VTG_SEQUENCE_DEFAULT_POI_HEAD_CYCLES_PER_ARM_CYCLE;
  }

  return cycles;
}

function createSnapshotFromState(state: AppState): SequenceSnapshotFromState {
  try {
    const classification = classifyVTG(state);
    const rightArmSign = resolveRightArmSign(state.hands.R.armSpeed);
    const rightHeadSpeedRadiansPerBeat = state.hands.R.armSpeed + state.hands.R.poiSpeed;

    return {
      descriptor: {
        armElement: classification.armElement,
        poiElement: classification.poiElement,
        poiHeadCyclesPerArmCycle: resolvePoiHeadCyclesPerArmCycle(rightHeadSpeedRadiansPerBeat, rightArmSign),
        rightArmSign
      },
      startPhaseDeg: classification.phaseDeg
    };
  } catch {
    return {
      descriptor: {
        armElement: "Earth",
        poiElement: "Earth",
        poiHeadCyclesPerArmCycle: VTG_SEQUENCE_DEFAULT_POI_HEAD_CYCLES_PER_ARM_CYCLE,
        rightArmSign: VTG_SEQUENCE_DEFAULT_RIGHT_ARM_SIGN
      },
      startPhaseDeg: 0
    };
  }
}

function toSequenceDescriptor(descriptor: VTGDescriptor, rightArmSign: VTGArmSign): VTGSequenceDescriptor {
  return {
    armElement: descriptor.armElement,
    poiElement: descriptor.poiElement,
    poiHeadCyclesPerArmCycle: descriptor.poiHeadCyclesPerArmCycle,
    rightArmSign
  };
}

function createSegmentId(nextSequenceNumber: number): string {
  return `${SEQUENCE_ID_PREFIX}-${nextSequenceNumber}`;
}

function cloneSequenceWithSegments(sequence: VTGSequence, segments: VTGSequenceSegment[]): VTGSequence {
  return {
    ...sequence,
    segments: segments.map((segment) => ({
      id: segment.id,
      durationBeats: segment.durationBeats,
      descriptor: {
        armElement: segment.descriptor.armElement,
        poiElement: segment.descriptor.poiElement,
        poiHeadCyclesPerArmCycle: segment.descriptor.poiHeadCyclesPerArmCycle,
        rightArmSign: segment.descriptor.rightArmSign
      }
    }))
  };
}

function findSegmentIndexById(segments: VTGSequenceSegment[], segmentId: string | null): number {
  if (!segmentId) {
    return -1;
  }
  return segments.findIndex((segment) => segment.id === segmentId);
}

function normalizeDurationForSnap(durationBeats: number, snapSetting: VTGSequenceSnapSetting): number {
  return snapSetting === "event" ? snapDurationToArmPhaseEvents(durationBeats) : durationBeats;
}

function createSegmentFromDescriptor(
  descriptor: VTGSequenceDescriptor,
  id: string,
  durationBeats: number,
  snapSetting: VTGSequenceSnapSetting
): VTGSequenceSegment {
  return {
    id,
    durationBeats: normalizeDurationForSnap(durationBeats, snapSetting),
    descriptor
  };
}

function applyAngularOverrides(
  hand: HandState,
  armSpeed: number,
  armPhase: number,
  poiSpeed: number,
  poiPhase: number
): HandState {
  return {
    ...hand,
    armSpeed,
    armPhase,
    poiSpeed,
    poiPhase
  };
}

function directionFromSpeed(speedRadiansPerBeat: number): SequenceDirectionSign {
  return speedRadiansPerBeat < 0 ? -1 : 1;
}

/**
 * Owns sequence-mode state, list editing, import/export, and continuity-based render selection.
 */
export function useVtgSequenceController(state: AppState, absolutePlayheadBeats: Ref<number>): VtgSequenceController {
  const sequenceMode = ref(false);
  const sequence = ref<VTGSequence>(createDefaultVTGSequence());
  const sequenceStatus = ref("");
  const selectedSegmentId = ref<string | null>(null);
  const trailResetEpoch = ref(0);
  let segmentSequenceNumber = 1;
  let sequenceStatusTimerId = 0;
  let lastLoopCycle = 0;

  function setSequenceStatus(message: string): void {
    sequenceStatus.value = message;
    if (sequenceStatusTimerId !== 0) {
      window.clearTimeout(sequenceStatusTimerId);
    }
    sequenceStatusTimerId = window.setTimeout(() => {
      sequenceStatus.value = "";
      sequenceStatusTimerId = 0;
    }, SEQUENCE_STATUS_RESET_DELAY_MS);
  }

  function commitSequence(nextSequence: VTGSequence): void {
    sequence.value = sanitizeVTGSequence(nextSequence);
    if (sequence.value.snapSetting === "event") {
      sequence.value = normalizeSequenceEventSnap(sequence.value);
    }

    const selectedIndex = findSegmentIndexById(sequence.value.segments, selectedSegmentId.value);
    if (selectedIndex === -1) {
      selectedSegmentId.value = sequence.value.segments[0]?.id ?? null;
    }
  }

  function addSegment(descriptor: VTGSequenceDescriptor, selectAdded: boolean): void {
    const nextId = createSegmentId(segmentSequenceNumber);
    segmentSequenceNumber += 1;

    const nextSegment = createSegmentFromDescriptor(
      descriptor,
      nextId,
      SEQUENCE_DEFAULT_SEGMENT_DURATION_BEATS,
      sequence.value.snapSetting
    );
    const nextSegments = [...sequence.value.segments, nextSegment];

    commitSequence(cloneSequenceWithSegments(sequence.value, nextSegments));

    if (selectAdded) {
      selectedSegmentId.value = nextId;
    }
  }

  const effectiveSequence = computed(() => normalizeSequenceEventSnap(sequence.value));
  const continuity = computed(() => resolveSequenceContinuity(effectiveSequence.value));

  const activeResolution = computed(() => {
    if (!sequenceMode.value) {
      return null;
    }

    const playhead = resolveSequencePlayheadBeats(continuity.value.sequence, absolutePlayheadBeats.value);
    if (!playhead) {
      return null;
    }

    const segment = continuity.value.segments[playhead.segmentIndex];
    if (!segment) {
      return null;
    }

    return {
      ...playhead,
      segment
    };
  });

  const segmentViews = computed((): SequenceSegmentView[] => {
    return effectiveSequence.value.segments.map((segment, index) => {
      const continuitySegment = continuity.value.segments[index];
      const armDirectionBadges = continuitySegment
        ? {
            L: directionFromSpeed(continuitySegment.speedProfile.leftArmSpeedRadiansPerBeat),
            R: directionFromSpeed(continuitySegment.speedProfile.rightArmSpeedRadiansPerBeat)
          }
        : deriveSequenceArmDirectionBadges(segment.descriptor);

      return {
        ...segment,
        descriptor: { ...segment.descriptor },
        armDirectionBadges,
        poiDirectionFlipBlocked: continuitySegment?.poiDirectionFlipBlocked ?? false
      };
    });
  });

  const activeDirectionBadges = computed<VTGSequenceDirectionBadges | null>(() => {
    const resolution = activeResolution.value;
    if (!resolution) {
      return null;
    }

    return {
      L: directionFromSpeed(resolution.segment.speedProfile.leftArmSpeedRadiansPerBeat),
      R: directionFromSpeed(resolution.segment.speedProfile.rightArmSpeedRadiansPerBeat)
    };
  });

  const selectedSegmentDescriptorForVtgPanel = computed(() => {
    if (!sequenceMode.value) {
      return null;
    }
    const selected = effectiveSequence.value.segments.find((segment) => segment.id === selectedSegmentId.value);
    if (!selected) {
      return null;
    }
    return toVTGDescriptor(selected.descriptor, effectiveSequence.value.startPhaseDeg);
  });

  const renderState = computed(() => {
    if (!sequenceMode.value) {
      return state;
    }

    const resolution = activeResolution.value;
    if (!resolution) {
      return state;
    }

    const { speedProfile, startAngles } = resolution.segment;
    const segmentStartBeat = continuity.value.boundaries.startsBeats[resolution.segmentIndex] ?? 0;
    const loopBeats = Math.max(continuity.value.totalBeats, MIN_LOOP_BEATS);

    const rightArmPhase = startAngles.rightArmRadians - speedProfile.rightArmSpeedRadiansPerBeat * segmentStartBeat;
    const leftArmPhase = startAngles.leftArmRadians - speedProfile.leftArmSpeedRadiansPerBeat * segmentStartBeat;
    const rightHeadPhase = startAngles.rightHeadRadians - speedProfile.rightHeadSpeedRadiansPerBeat * segmentStartBeat;
    const leftHeadPhase = startAngles.leftHeadRadians - speedProfile.leftHeadSpeedRadiansPerBeat * segmentStartBeat;

    return {
      global: {
        ...state.global,
        loopBeats
      },
      hands: {
        L: applyAngularOverrides(
          state.hands.L,
          speedProfile.leftArmSpeedRadiansPerBeat,
          leftArmPhase,
          speedProfile.leftHeadSpeedRadiansPerBeat - speedProfile.leftArmSpeedRadiansPerBeat,
          leftHeadPhase - leftArmPhase
        ),
        R: applyAngularOverrides(
          state.hands.R,
          speedProfile.rightArmSpeedRadiansPerBeat,
          rightArmPhase,
          speedProfile.rightHeadSpeedRadiansPerBeat - speedProfile.rightArmSpeedRadiansPerBeat,
          rightHeadPhase - rightArmPhase
        )
      }
    };
  });

  const renderBeat = computed(() => {
    if (!sequenceMode.value) {
      return state.global.t;
    }
    return activeResolution.value?.sequenceBeat ?? 0;
  });

  const transportLoopBeats = computed(() => {
    if (!sequenceMode.value) {
      return state.global.loopBeats;
    }
    return Math.max(continuity.value.totalBeats, MIN_LOOP_BEATS);
  });

  const transportPlayheadBeats = computed(() => {
    if (!sequenceMode.value) {
      return normalizeLoopBeat(state.global.t, state.global.loopBeats);
    }
    return activeResolution.value?.sequenceBeat ?? 0;
  });

  watch(
    [absolutePlayheadBeats, () => continuity.value.totalBeats, sequenceMode, () => sequence.value.loop, () => state.global.isPlaying],
    ([absoluteBeat, totalBeats, isSequenceMode, isLooping, isPlaying]) => {
      if (totalBeats <= 0) {
        lastLoopCycle = 0;
        return;
      }

      const nextLoopCycle = Math.floor(Math.max(absoluteBeat, 0) / totalBeats);
      if (isSequenceMode && isLooping && isPlaying && nextLoopCycle > lastLoopCycle) {
        trailResetEpoch.value += nextLoopCycle - lastLoopCycle;
      }
      lastLoopCycle = nextLoopCycle;
    },
    { immediate: true }
  );

  return {
    sequenceMode,
    sequence,
    sequenceStatus,
    selectedSegmentId,
    selectedSegmentDescriptorForVtgPanel,
    segmentViews,
    activeDirectionBadges,
    renderState,
    renderBeat,
    transportLoopBeats,
    transportPlayheadBeats,
    trailResetEpoch,
    handleSetSequenceMode(enabled: boolean, currentState: AppState): void {
      sequenceMode.value = enabled;
      if (!enabled) {
        return;
      }

      if (sequence.value.segments.length === 0) {
        const snapshot = createSnapshotFromState(currentState);
        commitSequence({
          ...sequence.value,
          startPhaseDeg: snapshot.startPhaseDeg
        });
        addSegment(snapshot.descriptor, true);
        setSequenceStatus("Sequence mode enabled");
      }
    },
    handleSetSequenceName(name: string): void {
      commitSequence({
        ...sequence.value,
        name
      });
    },
    handleSetSequenceLoop(loop: boolean): void {
      commitSequence({
        ...sequence.value,
        loop
      });
    },
    handleSetSnapSetting(snapSetting: VTGSequenceSnapSetting): void {
      commitSequence({
        ...sequence.value,
        snapSetting
      });
    },
    handleSetAllowPoiDirectionFlip(allowPoiDirectionFlip: boolean): void {
      commitSequence({
        ...sequence.value,
        allowPoiDirectionFlip
      });
    },
    handleSetSequenceStartPhaseDeg(startPhaseDeg: VTGPhaseDeg): void {
      commitSequence({
        ...sequence.value,
        startPhaseDeg
      });
    },
    handleSelectSegment(segmentId: string): void {
      selectedSegmentId.value = segmentId;
    },
    handleAddSegmentFromCurrentState(currentState: AppState): void {
      addSegment(createSnapshotFromState(currentState).descriptor, true);
    },
    handleReplaceSelectedDescriptor(descriptor: VTGDescriptor): void {
      const selectedIndex = findSegmentIndexById(sequence.value.segments, selectedSegmentId.value);
      if (selectedIndex < 0) {
        return;
      }

      const nextSegments = [...sequence.value.segments];
      const selected = nextSegments[selectedIndex];
      if (!selected) {
        return;
      }

      nextSegments[selectedIndex] = {
        ...selected,
        descriptor: toSequenceDescriptor(descriptor, selected.descriptor.rightArmSign)
      };

      commitSequence({
        ...cloneSequenceWithSegments(sequence.value, nextSegments),
        startPhaseDeg: descriptor.phaseDeg
      });
    },
    handleSetSelectedDurationBeats(durationBeats: number): void {
      const selectedIndex = findSegmentIndexById(sequence.value.segments, selectedSegmentId.value);
      if (selectedIndex < 0) {
        return;
      }

      const nextSegments = [...sequence.value.segments];
      const selected = nextSegments[selectedIndex];
      if (!selected) {
        return;
      }

      nextSegments[selectedIndex] = {
        ...selected,
        durationBeats: normalizeDurationForSnap(durationBeats, sequence.value.snapSetting)
      };

      commitSequence(cloneSequenceWithSegments(sequence.value, nextSegments));
    },
    handleSetSelectedRightArmSign(rightArmSign: VTGArmSign): void {
      const selectedIndex = findSegmentIndexById(sequence.value.segments, selectedSegmentId.value);
      if (selectedIndex < 0) {
        return;
      }

      const nextSegments = [...sequence.value.segments];
      const selected = nextSegments[selectedIndex];
      if (!selected) {
        return;
      }

      nextSegments[selectedIndex] = {
        ...selected,
        descriptor: {
          ...selected.descriptor,
          rightArmSign
        }
      };

      commitSequence(cloneSequenceWithSegments(sequence.value, nextSegments));
    },
    handleMoveSelectedSegment(direction: "up" | "down"): void {
      const selectedIndex = findSegmentIndexById(sequence.value.segments, selectedSegmentId.value);
      if (selectedIndex < 0) {
        return;
      }

      const targetIndex = direction === "up" ? selectedIndex - 1 : selectedIndex + 1;
      if (targetIndex < 0 || targetIndex >= sequence.value.segments.length) {
        return;
      }

      const nextSegments = [...sequence.value.segments];
      const selected = nextSegments[selectedIndex];
      const target = nextSegments[targetIndex];
      if (!selected || !target) {
        return;
      }

      nextSegments[selectedIndex] = target;
      nextSegments[targetIndex] = selected;
      commitSequence(cloneSequenceWithSegments(sequence.value, nextSegments));
    },
    handleDeleteSelectedSegment(): void {
      const selectedIndex = findSegmentIndexById(sequence.value.segments, selectedSegmentId.value);
      if (selectedIndex < 0) {
        return;
      }

      const nextSegments = sequence.value.segments.filter((_, index) => index !== selectedIndex);
      commitSequence(cloneSequenceWithSegments(sequence.value, nextSegments));
    },
    handleDuplicateSelectedSegment(): void {
      const selectedIndex = findSegmentIndexById(sequence.value.segments, selectedSegmentId.value);
      if (selectedIndex < 0) {
        return;
      }

      const selected = sequence.value.segments[selectedIndex];
      if (!selected) {
        return;
      }

      const duplicateId = createSegmentId(segmentSequenceNumber);
      segmentSequenceNumber += 1;

      const duplicate: VTGSequenceSegment = {
        id: duplicateId,
        durationBeats: selected.durationBeats,
        descriptor: {
          armElement: selected.descriptor.armElement,
          poiElement: selected.descriptor.poiElement,
          poiHeadCyclesPerArmCycle: selected.descriptor.poiHeadCyclesPerArmCycle,
          rightArmSign: selected.descriptor.rightArmSign
        }
      };

      const nextSegments = [...sequence.value.segments];
      nextSegments.splice(selectedIndex + 1, 0, duplicate);
      commitSequence(cloneSequenceWithSegments(sequence.value, nextSegments));
      selectedSegmentId.value = duplicateId;
    },
    handleExportSequence(): void {
      const fileName = createSequenceFileName(sequence.value.name);
      downloadTextFile(fileName, serializeVTGSequence(sequence.value));
      setSequenceStatus(`Exported: ${fileName}`);
    },
    async handleImportSequence(file: File): Promise<void> {
      try {
        const content = await file.text();
        const parsed = deserializeVTGSequence(content);
        if (!parsed.sequence) {
          setSequenceStatus(`Import failed: ${parsed.error ?? "invalid sequence file"}`);
          return;
        }

        commitSequence(parsed.sequence);
        selectedSegmentId.value = sequence.value.segments[0]?.id ?? null;

        const maxSequenceNumber = sequence.value.segments
          .map((segment) => Number.parseInt(segment.id.replace(`${SEQUENCE_ID_PREFIX}-`, ""), 10))
          .filter((value) => Number.isFinite(value))
          .reduce((maxValue, value) => Math.max(maxValue, value), 0);
        segmentSequenceNumber = Math.max(maxSequenceNumber + 1, 1);

        setSequenceStatus(`Imported: ${sequence.value.name}`);
      } catch {
        setSequenceStatus("Import failed: unreadable file");
      }
    },
    dispose(): void {
      if (sequenceStatusTimerId !== 0) {
        window.clearTimeout(sequenceStatusTimerId);
      }
    }
  };
}
