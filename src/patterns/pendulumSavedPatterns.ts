import { authoredDocumentFromMultiRigSequence } from "@/authoring/compile";
import type { MultiRigSequence } from "@/engine/types";
import {
  buildPendulumLabSequence,
  PENDULUM_PRESETS,
  type PendulumPresetId
} from "@/lab/experiments/pendulum/pendulumPresets";
import type { PatternEntry } from "@/patterns/types";

const DEFAULT_AMPLITUDE_RAD = Math.PI / 2;
const DEFAULT_CYCLES_PER_UNIT = 0.5;

function toAuthoringTrackIds(sequence: MultiRigSequence): MultiRigSequence {
  return {
    rigs: sequence.rigs.map((rig) => ({
      ...rig,
      rigId: rig.rigId === "poi" ? "left" : rig.rigId
    }))
  };
}

function makePendulumSavedPattern(presetId: PendulumPresetId): PatternEntry {
  const preset = PENDULUM_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) throw new Error(`Missing pendulum preset: ${presetId}`);

  const sequence = toAuthoringTrackIds(
    buildPendulumLabSequence({
      presetId,
      amplitudeRad: DEFAULT_AMPLITUDE_RAD,
      cyclesPerUnit: DEFAULT_CYCLES_PER_UNIT,
      swingPhaseRad: 0,
      pairOffsetRad: preset.defaultPairOffsetRad
    })
  );
  const name = `Pendulum · ${preset.label}`;

  return {
    id: `builtin-pendulum-${presetId}`,
    name,
    description: preset.summary,
    folderId: null,
    source: {
      kind: "authoring",
      document: authoredDocumentFromMultiRigSequence(sequence, {
        name,
        description: preset.summary
      })
    }
  };
}

export const pendulumSavedPatterns: readonly PatternEntry[] = PENDULUM_PRESETS.map((preset) =>
  makePendulumSavedPattern(preset.id)
);
