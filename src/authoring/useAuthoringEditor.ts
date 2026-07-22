import type { ComputedRef, Ref } from "vue";

import { compileAuthoredDocument, validateAuthoredDocument } from "@/authoring/compile";
import type {
  AuthoredCircleDriverInput,
  AuthoredContinuationSegment,
  AuthoredDocumentEntry,
  AuthoredDriverInput,
  AuthoredDriverKind,
  AuthoredOmegaUnit,
  AuthoredPendulumDriverInput,
  AuthoredRadiusProfileInput,
  AuthoredSegment,
  AuthoredSequenceDocument,
  AuthoredTrackId,
  CompileAuthoredDocumentResult
} from "@/authoring/types";
import { PI } from "@/engine/constants";
import type { PlaneId, PlaneSide } from "@/engine/types";

const TAU = 2 * PI;
const TRACK_IDS: readonly AuthoredTrackId[] = ["left", "right"];
const NODE_IDS: readonly EditableNode[] = ["hand", "head"];
const DEFAULT_PLANE_ID: PlaneId = "wall";
const DEFAULT_PLANE_SIDE: PlaneSide = "a";

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
  updateSegmentDriverKind(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    kind: AuthoredDriverKind
  ): void;
  updateSegmentPendulumField(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    field: "amplitudeDeg" | "cyclesPerUnit" | "swingPhaseDeg",
    value: number
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
  updateSegmentPlaneSide(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    planeSide: PlaneSide
  ): void;
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
  const radiusProfile = cloneRadiusProfile(driver.radiusProfile);
  return {
    kind: "circle",
    omega: toRadiansPerUnit(driver.omega, driver.omegaUnit),
    omegaUnit: "radians-per-unit",
    ...(radiusProfile ? { radiusProfile } : {})
  };
}

function cloneAuthoredDriver(driver: AuthoredDriverInput): AuthoredDriverInput {
  if (driver.kind === "pendulum") {
    return {
      kind: "pendulum",
      amplitudeDeg: driver.amplitudeDeg,
      cyclesPerUnit: driver.cyclesPerUnit,
      swingPhaseDeg: driver.swingPhaseDeg
    };
  }

  return toCanonicalCircleDriver(driver);
}

function cloneDriverForContinuation(
  driver: AuthoredDriverInput,
  sourceDurationUnits: number
): AuthoredDriverInput {
  const cloned = cloneAuthoredDriver(driver);
  if (cloned.kind === "pendulum") {
    cloned.swingPhaseDeg += 360 * cloned.cyclesPerUnit * sourceDurationUnits;
  }
  return cloned;
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
  const driver = segment[node].driver;
  if (driver.kind !== "circle") {
    return null;
  }
  driver.radiusProfile ??= { kind: "time-keyed", keys: [] };
  return driver.radiusProfile;
}

function normalizeDocumentDrivers(document: AuthoredSequenceDocument) {
  for (const trackId of TRACK_IDS) {
    const track = document.tracks[trackId];
    if (!track) {
      continue;
    }

    for (const segment of track.segments) {
      for (const node of NODE_IDS) {
        segment[node].driver = cloneAuthoredDriver(segment[node].driver);
      }
    }
  }
}

function wrapAngleDelta(angleRad: number): number {
  return ((((angleRad + PI) % TAU) + TAU) % TAU) - PI;
}

function angularDistance(a: number, b: number): number {
  return Math.abs(wrapAngleDelta(a - b));
}

function getHeadSwingPhaseDeg(
  startPhaseAbs: number,
  amplitudeDeg: number,
  referenceSwingPhaseDeg = 0
): number | null {
  const amplitudeRad = (amplitudeDeg * PI) / 180;
  const deltaFromDown = wrapAngleDelta(startPhaseAbs + PI / 2);
  if (amplitudeRad <= 0 || Math.abs(deltaFromDown) > amplitudeRad + 1e-9) {
    return null;
  }

  const base = Math.asin(Math.max(-1, Math.min(1, deltaFromDown / amplitudeRad)));
  const alternate = PI - base;
  const reference = (referenceSwingPhaseDeg * PI) / 180;
  const selected =
    angularDistance(base, reference) <= angularDistance(alternate, reference) ? base : alternate;
  return toPhaseDeg(selected);
}

function makeDefaultPendulumDriver(
  node: EditableNode,
  startPhaseAbs: number
): AuthoredPendulumDriverInput {
  return {
    kind: "pendulum",
    amplitudeDeg: 90,
    cyclesPerUnit: 0.5,
    swingPhaseDeg: node === "head" ? (getHeadSwingPhaseDeg(startPhaseAbs, 90) ?? 0) : 0
  };
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
    normalizeDocumentDrivers(nextDocument);

    const validation = validateAuthoredDocument(nextDocument);
    if (!validation.ok) {
      deps.compileErrorMessage.value = formatCompileErrors(validation);
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
              planeSide: DEFAULT_PLANE_SIDE,
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
      const continuation: AuthoredContinuationSegment = {
        kind: "continuation",
        durationUnits: source.durationUnits,
        planeId: source.planeId ?? DEFAULT_PLANE_ID,
        planeSide: source.planeSide ?? DEFAULT_PLANE_SIDE,
        hand: {
          driver: cloneDriverForContinuation(source.hand.driver, source.durationUnits)
        },
        head: {
          driver: cloneDriverForContinuation(source.head.driver, source.durationUnits)
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
      const duplicate: AuthoredContinuationSegment = {
        kind: "continuation",
        durationUnits: source.durationUnits,
        planeId: source.planeId ?? DEFAULT_PLANE_ID,
        planeSide: source.planeSide ?? DEFAULT_PLANE_SIDE,
        hand: {
          driver: cloneDriverForContinuation(source.hand.driver, source.durationUnits)
        },
        head: {
          driver: cloneDriverForContinuation(source.head.driver, source.durationUnits)
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
          track.segments[1] = {
            kind: "first",
            durationUnits: nextSegment.durationUnits,
            planeId: nextSegment.planeId ?? DEFAULT_PLANE_ID,
            planeSide: nextSegment.planeSide ?? DEFAULT_PLANE_SIDE,
            hand: {
              startPose: {
                phaseDeg: toPhaseDeg(promotedStartPose.handPose.phaseAbs),
                radius: promotedStartPose.handPose.radius
              },
              driver: cloneAuthoredDriver(nextSegment.hand.driver)
            },
            head: {
              startPose: {
                phaseDeg: toPhaseDeg(promotedStartPose.headPose.phaseAbs),
                radius: promotedStartPose.headPose.radius
              },
              driver: cloneAuthoredDriver(nextSegment.head.driver)
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
      if (segment?.[node].driver.kind === "circle") {
        segment[node].driver.omega = omega;
        segment[node].driver.omegaUnit = "radians-per-unit";
      }
      return { trackId, segmentIndex };
    });
  }

  function updateSegmentDriverKind(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    kind: AuthoredDriverKind
  ) {
    const startPose =
      deps.lastValidCompiled.value.boundariesByTrack[trackId]?.[segmentIndex]?.startPose;
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      if (!segment || segment[node].driver.kind === kind || !startPose) {
        return { trackId, segmentIndex };
      }

      if (kind === "pendulum") {
        const phaseAbs =
          node === "hand" ? startPose.handPose.phaseAbs : startPose.headPose.phaseAbs;
        segment[node].driver = makeDefaultPendulumDriver(node, phaseAbs);
      } else {
        segment[node].driver = {
          kind: "circle",
          omega: 0,
          omegaUnit: "radians-per-unit"
        };
      }
      return { trackId, segmentIndex };
    });
  }

  function updateSegmentPendulumField(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    node: EditableNode,
    field: "amplitudeDeg" | "cyclesPerUnit" | "swingPhaseDeg",
    value: number
  ) {
    const startPose =
      deps.lastValidCompiled.value.boundariesByTrack[trackId]?.[segmentIndex]?.startPose;
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      const driver = segment?.[node].driver;
      if (!segment || driver?.kind !== "pendulum") {
        return { trackId, segmentIndex };
      }

      driver[field] = value;
      if (node === "head" && segment.kind === "first") {
        segment.head.startPose.phaseDeg =
          -90 + driver.amplitudeDeg * Math.sin((driver.swingPhaseDeg * PI) / 180);
      } else if (node === "head" && field === "amplitudeDeg" && startPose) {
        const nextSwingPhaseDeg = getHeadSwingPhaseDeg(
          startPose.headPose.phaseAbs,
          driver.amplitudeDeg,
          driver.swingPhaseDeg
        );
        if (nextSwingPhaseDeg !== null) {
          driver.swingPhaseDeg = nextSwingPhaseDeg;
        }
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
        radiusProfile?.keys.push({ t: key.t, radius: key.radius });
        radiusProfile?.keys.sort((a, b) => a.t - b.t);
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
      const driver = segment?.[node].driver;
      const radiusProfile = driver?.kind === "circle" ? driver.radiusProfile : undefined;
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
      const driver = segment?.[node].driver;
      if (driver?.kind === "circle" && driver.radiusProfile) {
        driver.radiusProfile.keys.splice(keyIndex, 1);
        if (driver.radiusProfile.keys.length === 0) {
          delete driver.radiusProfile;
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

  function updateSegmentPlaneSide(
    trackId: AuthoredTrackId,
    segmentIndex: number,
    planeSide: PlaneSide
  ) {
    commitDocumentChange((nextDocument) => {
      const segment = nextDocument.tracks[trackId]?.segments[segmentIndex];
      if (segment) {
        segment.planeSide = planeSide;
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
    updateSegmentDriverKind,
    updateSegmentPendulumField,
    addSegmentRadiusProfileKey,
    updateSegmentRadiusProfileKey,
    deleteSegmentRadiusProfileKey,
    updateSegmentPlane,
    updateSegmentPlaneSide,
    updateDocumentName,
    updateDocumentDescription
  };
}
