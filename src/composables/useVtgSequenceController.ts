import { normalizeLoopBeat } from "@/state/beatMath";
import type { AppState, HandState } from "@/types/state";
import { classifyVTG } from "@/vtg/classify";
import {
  computeSequenceBoundariesBeats,
  createDefaultVTGSequence,
  deserializeVTGSequence,
  normalizeSequenceEventSnap,
  resolveSequenceContinuity,
  resolveSequencePlayheadBeats,
  sanitizeVTGSequence,
  serializeVTGSequence,
  snapDurationToArmPhaseEvents,
  toVTGDescriptor,
  type VTGSequence,
  type VTGSequenceDescriptor,
  type VTGSequenceSegment,
  type VTGSequenceSnapSetting
} from "@/vtg/sequence";
import {
  headSpeedRadiansPerBeatToPoiHeadCyclesPerArmCycle,
  type VTGDescriptor,
  type VTGPhaseDeg
} from "@/vtg/types";
import { computed, ref, type ComputedRef, type Ref } from "vue";

const SEQUENCE_STATUS_RESET_DELAY_MS = 2400;
const SEQUENCE_DEFAULT_SEGMENT_DURATION_BEATS = 1;
const SEQUENCE_FILE_EXTENSION = ".json";
const SEQUENCE_FILE_FALLBACK_NAME = "vtg-sequence";
const SEQUENCE_ID_PREFIX = "seg";
const MIN_LOOP_BEATS = 0.25;

interface SequenceSnapshotFromState {
  descriptor: VTGSequenceDescriptor;
  startPhaseDeg: VTGPhaseDeg;
}

export interface SequenceSegmentView extends VTGSequenceSegment {}

export interface VtgSequenceController {
  sequenceMode: Ref<boolean>;
  sequence: Ref<VTGSequence>;
  sequenceStatus: Ref<string>;
  selectedSegmentId: Ref<string | null>;
  selectedSegmentDescriptorForVtgPanel: ComputedRef<VTGDescriptor | null>;
  segmentViews: ComputedRef<SequenceSegmentView[]>;
  renderState: ComputedRef<AppState>;
  renderBeat: ComputedRef<number>;
  transportLoopBeats: ComputedRef<number>;
  transportPlayheadBeats: ComputedRef<number>;
  handleSetSequenceMode: (enabled: boolean, state: AppState) => void;
  handleSetSequenceName: (name: string) => void;
  handleSetSequenceLoop: (loop: boolean) => void;
  handleSetSnapSetting: (snapSetting: VTGSequenceSnapSetting) => void;
  handleSetSequenceStartPhaseDeg: (startPhaseDeg: VTGPhaseDeg) => void;
  handleSelectSegment: (segmentId: string) => void;
  handleAddSegmentFromCurrentState: (state: AppState) => void;
  handleReplaceSelectedDescriptor: (descriptor: VTGDescriptor) => void;
  handleSetSelectedDurationBeats: (durationBeats: number) => void;
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

function createSnapshotFromState(state: AppState): SequenceSnapshotFromState {
  try {
    const classification = classifyVTG(state);
    const rightHeadCyclesPerArmCycle = headSpeedRadiansPerBeatToPoiHeadCyclesPerArmCycle(
      state.hands.R.armSpeed + state.hands.R.poiSpeed
    );

    return {
      descriptor: {
        armElement: classification.armElement,
        poiElement: classification.poiElement,
        poiHeadCyclesPerArmCycle: rightHeadCyclesPerArmCycle
      },
      startPhaseDeg: classification.phaseDeg
    };
  } catch {
    return {
      descriptor: {
        armElement: "Earth",
        poiElement: "Earth",
        poiHeadCyclesPerArmCycle: -3
      },
      startPhaseDeg: 0
    };
  }
}

function toSequenceDescriptor(descriptor: VTGDescriptor): VTGSequenceDescriptor {
  return {
    armElement: descriptor.armElement,
    poiElement: descriptor.poiElement,
    poiHeadCyclesPerArmCycle: descriptor.poiHeadCyclesPerArmCycle
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
        poiHeadCyclesPerArmCycle: segment.descriptor.poiHeadCyclesPerArmCycle
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

/**
 * Owns sequence-mode state, list editing, import/export, and continuity-based render selection.
 */
export function useVtgSequenceController(state: AppState, absolutePlayheadBeats: Ref<number>): VtgSequenceController {
  const sequenceMode = ref(false);
  const sequence = ref<VTGSequence>(createDefaultVTGSequence());
  const sequenceStatus = ref("");
  const selectedSegmentId = ref<string | null>(null);
  let segmentSequenceNumber = 1;
  let sequenceStatusTimerId = 0;

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
    return effectiveSequence.value.segments.map((segment) => ({
      ...segment,
      descriptor: { ...segment.descriptor }
    }));
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
    const boundaries = computeSequenceBoundariesBeats(effectiveSequence.value);
    const loopBeats = Math.max(boundaries.totalBeats, MIN_LOOP_BEATS);

    return {
      global: {
        ...state.global,
        loopBeats
      },
      hands: {
        L: applyAngularOverrides(
          state.hands.L,
          speedProfile.leftArmSpeedRadiansPerBeat,
          startAngles.leftArmRadians,
          speedProfile.leftHeadSpeedRadiansPerBeat - speedProfile.leftArmSpeedRadiansPerBeat,
          startAngles.leftHeadRadians - startAngles.leftArmRadians
        ),
        R: applyAngularOverrides(
          state.hands.R,
          speedProfile.rightArmSpeedRadiansPerBeat,
          startAngles.rightArmRadians,
          speedProfile.rightHeadSpeedRadiansPerBeat - speedProfile.rightArmSpeedRadiansPerBeat,
          startAngles.rightHeadRadians - startAngles.rightArmRadians
        )
      }
    };
  });

  const renderBeat = computed(() => {
    if (!sequenceMode.value) {
      return state.global.t;
    }
    return activeResolution.value?.localBeat ?? 0;
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

  return {
    sequenceMode,
    sequence,
    sequenceStatus,
    selectedSegmentId,
    selectedSegmentDescriptorForVtgPanel,
    segmentViews,
    renderState,
    renderBeat,
    transportLoopBeats,
    transportPlayheadBeats,
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
        descriptor: toSequenceDescriptor(descriptor)
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
          poiHeadCyclesPerArmCycle: selected.descriptor.poiHeadCyclesPerArmCycle
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
