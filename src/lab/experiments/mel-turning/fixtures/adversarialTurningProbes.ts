import { getVerifiedTurningTrace } from "@/lab/experiments/mel-turning/fixtures/verifiedTurningTraces";
import {
  analyzeTurningTraceTurn,
  type TurnEdgeAnalysis,
  type TurnEdgeContractStatus,
  type TurnEdgeDiagnosticCode
} from "@/lab/experiments/mel-turning/model/turnEdgeAnalysis";
import type {
  BodyTurnEvent,
  TurningHand,
  TurningNode,
  TurningTrace
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type AdversarialProbeExpectation = "structurally-invalid" | "structurally-valid-unresolved";

export interface AdversarialTurningProbe {
  readonly id: string;
  readonly label: string;
  readonly mutation: string;
  readonly lesson: string;
  readonly expectation: AdversarialProbeExpectation;
  readonly expectedDiagnostics: readonly TurnEdgeDiagnosticCode[];
  readonly trace: TurningTrace;
}

export interface AdversarialTurningProbeResult {
  readonly probe: AdversarialTurningProbe;
  readonly analysis: TurnEdgeAnalysis;
  readonly matchedExpectation: boolean;
}

function cloneAsUnverified(
  source: TurningTrace,
  id: string,
  label: string,
  update: (trace: TurningTrace) => TurningTrace
): TurningTrace {
  const clone: TurningTrace = {
    ...source,
    id,
    label,
    verificationStatus: "unverified",
    tracks: source.tracks.map((track) => ({
      ...track,
      nodes: track.nodes.map((node) => ({ ...node }))
    })),
    events: source.events.map((event) => ({ ...event }))
  };
  return update(clone);
}

function updateFirstEvent(
  trace: TurningTrace,
  update: (event: BodyTurnEvent) => BodyTurnEvent
): TurningTrace {
  const first = trace.events[0];
  if (!first) throw new Error(`${trace.id} has no event to mutate.`);
  return {
    ...trace,
    events: [update(first), ...trace.events.slice(1)]
  };
}

function updateNode(
  trace: TurningTrace,
  hand: TurningHand,
  step: number,
  update: (node: TurningNode) => TurningNode
): TurningTrace {
  return {
    ...trace,
    tracks: trace.tracks.map((track) =>
      track.hand === hand
        ? {
            ...track,
            nodes: track.nodes.map((node) => (node.step === step ? update(node) : node))
          }
        : track
    )
  };
}

const directLeft = getVerifiedTurningTrace("ts-left-chasing-1-to-2");
const preparedRight = getVerifiedTurningTrace("ts-right-chasing-2-to-1");

export const ADVERSARIAL_TURNING_PROBES: readonly AdversarialTurningProbe[] = [
  {
    id: "phase-reset",
    label: "Reset one hand’s phase",
    mutation: "Right target phase is copied from its source instead of advancing one halfbeat.",
    lesson: "Continuous timing is structural and must be rejected before physical assessment.",
    expectation: "structurally-invalid",
    expectedDiagnostics: ["TURN_PHASE_DISCONTINUITY"],
    trace: cloneAsUnverified(directLeft, "probe-phase-reset", "Probe · phase reset", (trace) => {
      const event = trace.events[0];
      const right = trace.tracks.find((track) => track.hand === "right");
      const source = right?.nodes.find((node) => node.step === event?.afterStep);
      if (!event || !source) throw new Error("Probe fixture invariant failed.");
      return updateNode(trace, "right", event.afterStep + 1, (node) => ({
        ...node,
        phase: source.phase
      }));
    })
  },
  {
    id: "missing-right-target",
    label: "Delete one hand’s target node",
    mutation: "The right track has no node at the shared turn target step.",
    lesson: "A shared turn cannot silently desynchronize the two hand tracks.",
    expectation: "structurally-invalid",
    expectedDiagnostics: ["TURN_TARGET_NODE_MISSING"],
    trace: cloneAsUnverified(
      directLeft,
      "probe-missing-right-target",
      "Probe · missing right target",
      (trace) => {
        const event = trace.events[0];
        if (!event) throw new Error("Probe fixture invariant failed.");
        return {
          ...trace,
          tracks: trace.tracks.map((track) =>
            track.hand === "right"
              ? {
                  ...track,
                  nodes: track.nodes.filter((node) => node.step !== event.afterStep + 1)
                }
              : track
          )
        };
      }
    )
  },
  {
    id: "facing-not-flipped",
    label: "Keep the same facing",
    mutation: "The event claims a 180-degree turn but leaves both endpoints facing 0.",
    lesson: "Body-facing change is part of the turn-edge structure, not a display annotation.",
    expectation: "structurally-invalid",
    expectedDiagnostics: ["TURN_FACING_NOT_FLIPPED"],
    trace: cloneAsUnverified(
      directLeft,
      "probe-facing-not-flipped",
      "Probe · unchanged facing",
      (trace) =>
        updateFirstEvent(trace, (event) => ({
          ...event,
          toFacing: 0
        }))
    )
  },
  {
    id: "turn-halfbeat-earlier",
    label: "Move the shared turn earlier",
    mutation: "The same tracks turn at t6→t7 instead of the verified t7→t8 edge.",
    lesson: "Timing remains structurally sound, but the new body/plane relationship is unverified.",
    expectation: "structurally-valid-unresolved",
    expectedDiagnostics: [],
    trace: cloneAsUnverified(
      directLeft,
      "probe-turn-halfbeat-earlier",
      "Probe · earlier shared turn",
      (trace) =>
        updateFirstEvent(trace, (event) => ({
          ...event,
          afterStep: event.afterStep - 1
        }))
    )
  },
  {
    id: "flip-right-target-plane",
    label: "Flip one destination plane side",
    mutation: "Right target changes from B to A while every other node stays fixed.",
    lesson: "Alternating phase still works; gate and anatomy are needed to decide physical legality.",
    expectation: "structurally-valid-unresolved",
    expectedDiagnostics: [],
    trace: cloneAsUnverified(
      directLeft,
      "probe-flip-right-target-plane",
      "Probe · flipped right target",
      (trace) => {
        const event = trace.events[0];
        if (!event) throw new Error("Probe fixture invariant failed.");
        return updateNode(trace, "right", event.afterStep + 1, (node) => ({
          ...node,
          planeSide: node.planeSide === "a" ? "b" : "a"
        }));
      }
    )
  },
  {
    id: "reverse-body-turn",
    label: "Reverse only the body turn",
    mutation: "The verified left-turn tracks are relabeled as a right turn.",
    lesson: "The compact structural contract does not yet contain anatomical gate legality.",
    expectation: "structurally-valid-unresolved",
    expectedDiagnostics: [],
    trace: cloneAsUnverified(
      directLeft,
      "probe-reverse-body-turn",
      "Probe · reverse body turn",
      (trace) =>
        updateFirstEvent(trace, (event) => ({
          ...event,
          direction: event.direction === "left" ? "right" : "left"
        }))
    )
  },
  {
    id: "remove-preparation",
    label: "Remove the known preparation edge",
    mutation:
      "TS right chasing-2→1 restores the left t7 node to its t3 source-cycle position.",
    lesson:
      "The resulting direct bridge is structurally coherent but loses the physical verification carried by the prepared route.",
    expectation: "structurally-valid-unresolved",
    expectedDiagnostics: [],
    trace: cloneAsUnverified(
      preparedRight,
      "probe-remove-preparation",
      "Probe · remove preparation",
      (trace) => {
        const event = trace.events[0];
        const left = trace.tracks.find((track) => track.hand === "left");
        const cycleReference = left?.nodes.find((node) => node.step === (event?.afterStep ?? 0) - 4);
        if (!event || !cycleReference) throw new Error("Probe fixture invariant failed.");
        return updateNode(trace, "left", event.afterStep, (node) => ({
          ...node,
          laneId: cycleReference.laneId,
          planeSide: cycleReference.planeSide,
          ...(cycleReference.handPlacement
            ? { handPlacement: cycleReference.handPlacement }
            : {})
        }));
      }
    )
  }
] as const;

function expectedContract(expectation: AdversarialProbeExpectation): TurnEdgeContractStatus {
  return expectation === "structurally-invalid" ? "invalid" : "valid";
}

export function evaluateAdversarialTurningProbes(): readonly AdversarialTurningProbeResult[] {
  return ADVERSARIAL_TURNING_PROBES.map((probe) => {
    const analysis = analyzeTurningTraceTurn(probe.trace);
    const diagnosticCodes = analysis.diagnostics.map((diagnostic) => diagnostic.code);
    const expectedPhysicalStatus =
      probe.expectation === "structurally-invalid" ? "not-assessed" : "unresolved";
    const matchedExpectation =
      analysis.contractStatus === expectedContract(probe.expectation) &&
      analysis.physicalStatus === expectedPhysicalStatus &&
      probe.expectedDiagnostics.every((code) => diagnosticCodes.includes(code));

    return {
      probe,
      analysis,
      matchedExpectation
    };
  });
}
