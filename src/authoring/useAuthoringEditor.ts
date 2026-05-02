import type { ComputedRef, Ref } from "vue";

import { compileAuthoredDocument, validateAuthoredDocument } from "@/authoring/compile";
import type {
  AuthoredCircleDriverInput,
  AuthoredContinuationSegment,
  AuthoredDocumentEntry,
  AuthoredOmegaUnit,
  AuthoredRadiusProfileInput,
  AuthoredSegment,
  AuthoredSequenceDocument,
  AuthoredTrackId,
  CompileAuthoredDocumentResult
} from "@/authoring/types";
import { PI } from "@/engine/constants";
import type { PlaneId } from "@/engine/types";

const TAU = 2 * PI;
const TRACK_IDS: readonly AuthoredTrackId[] = ["left", "right"];
const NODE_IDS: readonly EditableNode[] = ["hand", "head"];
const DEFAULT_PLANE_ID: PlaneId = "wall";

export type EditableNode = "hand" | "head";
export type SelectedSegment = { trackId: AuthoredTrackId; segmentIndex: number } | null;
export type CompileSuccess = Extract<CompileAuthoredDocumentResult, { ok: true }>;

export interface AuthoringEditorDeps {
  readonly selectedEntry: ComputedRef<AuthoredDocumentEntry | null>;
  readonly lastValidCompiled: Ref<CompileSuccess>;
  readonly selectedSegment: Ref<SelectedSegment>;
  readonly compileErrorMessage: Ref<string | null>;
  /** Called after a successful compile to persist the new document. */
  readonly persist: (id: string, document: AuthoredSequenceDocument) => void;
}

export interface AuthoringEditor {
  addSegment(trackId: AuthoredTrackId): void;
  duplicateSegment(trackId: AuthoredTrackId, segmentIndex: number): void;
  deleteSegment(trackId: AuthoredTrackId, segmentIndex: number): void;
  updateSegmentDuration(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    durationUnits: number
  ): void;
  updateSegmentStartPose(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    field: "phaseDeg" | "radius",
    value: number
  ): void;
  updateSegmentOmega(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    omega: number
  ): void;
  addSegmentRadiusProfileKey(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    key: { t: number; radius: number }
  ): void;
  updateSegmentRadiusProfileKey(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    keyIndex: number,
    field: "t" | "radius",
    value: number
  ): void;
  deleteSegmentRadiusProfileKey(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    keyIndex: number
  ): void;
  updateSegmentPlane(trackId: AuthoredTrackId, segmentIndex: number, planeId: PlaneId): void;
  updateDocumentName(nextValue: string): void;
  updateDocumentDescription(nextValue: string | null): void;
}

function cloneDocument(document: AuthoredSequenceDocument): AuthoredSequenceDocument {
  return JSON.parse(JSON.stringify(document)) as AuthoredSequenceDocument;
}

function toPhaseDeg(phaseRad: number): number {
  return (phaseRad * 180) / PI;
}

function convertOmegaValue(value: number, fromUnit: AuthoredOmegaUnit, toUnit: AuthoredOmegaUnit) {
  if (fromUnit === toUnit) {
    return value;
  }
  return fromUnit === "circles-per-unit" ? value * TAU : value / TAU;
}

function toRadiansPerUnit(value: number, unit: AuthoredOmegaUnit): number {
  return convertOmegaValue(value, unit, "radians-per-unit");
}

function toCanonicalCircleDriver(driver: AuthoredCircleDriverInput): AuthoredCircleDriverInput {
  return {
    kind: "circle",
    omega: toRadiansPerUnit(driver.omega, driver.omegaUnit),
    omegaUnit: "radians-per-unit"
  };
}

function cloneRadiusProfile(
  radiusProfile: AuthoredRadiusProfileInput | undefined
): AuthoredRadiusProfileInput | undefined {
  if (!radiusProfile || radiusProfile.keys.length === 0) {
    return undefined;
  }

  return {
    kind: "time-keyed",
    keys: radiusProfile.keys.map((key) => ({ t: key.t, radius: key.radius }))
  };
}

function ensureRadiusProfile(segment: AuthoredSegment, node: EditableNode) {
  segment[node].radiusProfile ??= { kind: "time-keyed", keys: [] };
  return segment[node].radiusProfile;
}

function normalizeDocumentOmegaUnits(document: AuthoredSequenceDocument) {
  for (const trackId of TRACK_IDS) {
    const track = document.tracks[trackId];
    if (!track) {
      continue;
    }

    for (const segment of track.segments) {
      for (const node of NODE_IDS) {
        segment[node].driver = toCanonicalCircleDriver(segment[node].driver);
      }
    }
  }
}

function formatCompileErrors(result: CompileAuthoredDocumentResult): string | null {
  if (result.ok) {
    return null;
  }

  return result.errors
    .map((error) => [error.trackId, error.segmentIndex, error.code].filter(Boolean).join(" / "))
    .join(", ");
}

export function useAuthoringEditor(deps: AuthoringEditorDeps): AuthoringEditor {
  function commitDocumentChange(
    mutate: (nextDocument: AuthoredSequenceDocument) => SelectedSegment
  ) {
    const entry = deps.selectedEntry.value;
    if (!entry) {
      return;
    }

    const nextDocument = cloneDocument(entry.document);
    const nextSelectedSegment = mutate(nextDocument);
    normalizeDocumentOmegaUnits(nextDocument);

    const validation = validateAuthoredDocument(nextDocument);
    if (!validation.ok) {
      return;
    }

    const compileResult = compileAuthoredDocument(nextDocument);
    if (!compileResult.ok) {
      deps.compileErrorMessage.value = formatCompileErrors(compileResult);
      return;
    }

    deps.compileErrorMessage.value = null;
    deps.lastValidCompiled.value = compileResult;
    deps.selectedSegment.value = nextSelectedSegment;
    deps.persist(entry.id, nextDocument);
  }

  function addSegment(trackId: AuthoredTrackId) {
    commitDocumentChange((nextDocument) => {
      const track = nextDocument.tracks[trackId];
      if (!track) {
        nextDocument.tracks[trackId] = {
          segments: [
            {
              kind: "first",
              durationUnits: 1,
              planeId: DEFAULT_PLANE_ID,
              hand: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              },
              head: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              }
            }
          ]
        };
        return { trackId, segmentIndex: 0 };
      }

      const source = track.segments[track.segments.length - 1];
      const handRadiusProfile = cloneRadiusProfile(source.hand.radiusProfile);
      const headRadiusProfile = cloneRadiusProfile(source.head.radiusProfile);
      const continuation: AuthoredContinuationSegment = {
        kind: "continuation",
        durationUnits: source.durationUnits,
        planeId: source.planeId ?? DEFAULT_PLANE_ID,
        hand: {
          driver: toCanonicalCircleDriver(source.hand.driver),
          ...(handRadiusProfile ? { radiusProfile: handRadiusProfile } : {})
        },
        head: {
          driver: toCanonicalCircleDriver(source.head.driver),
          ...(headRadiusProfile ? { radiusProfile: headRadiusProfile } : {})
        }
      };

      // Always append new segments to the tail of the track.
      const insertIndex = track.segments.length;
      track.segments.splice(insertIndex, 0, continuation);
      return { trackId, segmentIndex: insertIndex };
    });
  }

  function duplicateSegment(trackId: AuthoredTrackId, segmentIndex: number) {
    commitDocumentChange((nextDocument) => {
      const track = nextDocument.tracks[trackId];
      if (!track) {
        return deps.selectedSegment.value;
      }

      const source = track.segments[segmentIndex];
      const handRadiusProfile = cloneRadiusProfile(source.hand.radiusProfile);
      const headRadiusProfile = cloneRadiusProfile(source.head.radiusProfile);
      const duplicate: AuthoredContinuationSegment = {
        kind: "continuation",
        durationUnits: source.durationUnits,
        planeId: source.planeId ?? DEFAULT_PLANE_ID,
        hand: {
          driver: toCanonicalCircleDriver(source.hand.driver),
          ...(handRadiusProfile ? { radiusProfile: handRadiusProfile } : {})
        },
        head: {
          driver: toCanonicalCircleDriver(source.head.driver),
          ...(headRadiusProfile ? { radiusProfile: headRadiusProfile } : {})
        }
      };
      track.segments.splice(segmentIndex + 1, 0, duplicate);
      return { trackId, segmentIndex: segmentIndex + 1 };
    });
  }

  function deleteSegment(trackId: AuthoredTrackId, segmentIndex: number) {
    const entry = deps.selectedEntry.value;
    if (!entry) {
      return;
    }

    const currentTrack = entry.document.tracks[trackId];
    if (!currentTrack) {
      return;
    }

    const presentTrackIds = TRACK_IDS.filter((id) => entry.document.tracks[id]);
    if (currentTrack.segments.length === 1 && presentTrackIds.length === 1) {
      return;
    }

    const boundaries = deps.lastValidCompiled.value.boundariesByTrack[trackId] ?? [];

    commitDocumentChange((nextDocument) => {
      const track = nextDocument.tracks[trackId];
      if (!track) {
        return deps.selectedSegment.value;
      }

      if (track.segments.length === 1) {
        delete nextDocument.tracks[trackId];
        return deps.selectedSegment.value?.trackId === trackId ? null : deps.selectedSegment.value;
      }

      if (segmentIndex === 0) {
        const nextSegment = track.segments[1];
        const promotedStartPose = boundaries[1]?.startPose;
        if (nextSegment && promotedStartPose) {
          const handRadiusProfile = cloneRadiusProfile(nextSegment.hand.radiusProfile);
          const headRadiusProfile = cloneRadiusProfile(nextSegment.head.radiusProfile);
          track.segments[1] = {
            kind: "first",
            durationUnits: nextSegment.durationUnits,
            planeId: nextSegment.planeId ?? DEFAULT_PLANE_ID,
            hand: {
              startPose: {
                phaseDeg: toPhaseDeg(promotedStartPose.handPose.phaseAbs),
                radius: promotedStartPose.handPose.radius
              },
              driver: toCanonicalCircleDriver(nextSegment.hand.driver),
              ...(handRadiusProfile ? { radiusProfile: handRadiusProfile } : {})
            },
            head: {
              startPose: {
                phaseDeg: toPhaseDeg(promotedStartPose.headPose.phaseAbs),
                radius: promotedStartPose.headPose.radius
              },
              driver: toCanonicalCircleDriver(nextSegment.head.driver),
              ...(headRadiusProfile ? { radiusProfile: headRadiusProfile } : {})
            }
          };
        }
      }

      track.segments.splice(segmentIndex, 1);
      return { trackId, segmentIndex: Math.min(segmentIndex, track.segments.length - 1) };
    });
  }

  function updateSegmentDuration(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    durationUnits: number
  ) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      if (segment) {
        segment.durationUnits = durationUnits;
      }
      return { trackId, segmentIndex };
    });
  }

  function updateSegmentStartPose(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    field: "phaseDeg" | "radius",
    value: number
  ) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      if (segment?.kind === "first") {
        segment[node].startPose[field] = value;
      }
      return { trackId, segmentIndex };
    });
  }

  function updateSegmentOmega(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    omega: number
  ) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      if (segment) {
        segment[node].driver.omega = omega;
        segment[node].driver.omegaUnit = "radians-per-unit";
      }
      return { trackId, segmentIndex };
    });
  }

  function addSegmentRadiusProfileKey(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    key: { t: number; radius: number }
  ) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      if (segment) {
        const radiusProfile = ensureRadiusProfile(segment, node);
        radiusProfile.keys.push({ t: key.t, radius: key.radius });
        radiusProfile.keys.sort((a, b) => a.t - b.t);
      }
      return { trackId, segmentIndex };
    });
  }

  function updateSegmentRadiusProfileKey(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    keyIndex: number,
    field: "t" | "radius",
    value: number
  ) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      const radiusProfile = segment?.[node].radiusProfile;
      const key = radiusProfile?.keys[keyIndex];
      if (key) {
        key[field] = value;
        radiusProfile.keys.sort((a, b) => a.t - b.t);
      }
      return { trackId, segmentIndex };
    });
  }

  function deleteSegmentRadiusProfileKey(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    keyIndex: number
  ) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      const radiusProfile = segment?.[node].radiusProfile;
      if (radiusProfile) {
        radiusProfile.keys.splice(keyIndex, 1);
        if (radiusProfile.keys.length === 0) {
          delete segment[node].radiusProfile;
        }
      }
      return { trackId, segmentIndex };
    });
  }

  function updateSegmentPlane(trackId: AuthoredTrackId, segmentIndex: number, planeId: PlaneId) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      if (segment) {
        segment.planeId = planeId;
      }
      return { trackId, segmentIndex };
    });
  }

  function updateDocumentName(nextValue: string) {
    const entry = deps.selectedEntry.value;
    if (!entry) return;
    const trimmed = nextValue.trim() || "Untitled";
    if (trimmed === entry.document.name) return;
    commitDocumentChange((nextDocument) => {
      nextDocument.name = trimmed;
      return deps.selectedSegment.value;
    });
  }

  function updateDocumentDescription(nextValue: string | null) {
    const entry = deps.selectedEntry.value;
    if (!entry) return;
    const normalized = nextValue && nextValue.trim() ? nextValue : null;
    if (normalized === (entry.document.description ?? null)) return;
    commitDocumentChange((nextDocument) => {
      nextDocument.description = normalized;
      return deps.selectedSegment.value;
    });
  }

  return {
    addSegment,
    duplicateSegment,
    deleteSegment,
    updateSegmentDuration,
    updateSegmentStartPose,
    updateSegmentOmega,
    addSegmentRadiusProfileKey,
    updateSegmentRadiusProfileKey,
    deleteSegmentRadiusProfileKey,
    updateSegmentPlane,
    updateDocumentName,
    updateDocumentDescription
  };
}
