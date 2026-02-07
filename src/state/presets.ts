import type {
  AppState,
  ElementPresetId,
  FlowerMode,
  FlowerPetalCount,
  HandsState,
  PresetId,
  PresetDefinition
} from "@/types/state";
import { PETAL_COUNTS, SAME_TIME_PHASE_OFFSET, SPLIT_TIME_PHASE_OFFSET } from "@/state/constants";

interface ElementPresetContract {
  id: ElementPresetId;
  label: string;
  sameTime: boolean;
  sameDirection: boolean;
}

const ELEMENT_PRESETS: ElementPresetContract[] = [
  { id: "earth", label: "Earth", sameTime: true, sameDirection: true },
  { id: "air", label: "Air", sameTime: true, sameDirection: false },
  { id: "water", label: "Water", sameTime: false, sameDirection: true },
  { id: "fire", label: "Fire", sameTime: false, sameDirection: false }
];

interface FlowerPresetContract {
  id: `${FlowerMode}-${FlowerPetalCount}`;
  label: string;
  mode: FlowerMode;
  petals: FlowerPetalCount;
}

const FLOWER_PRESETS: FlowerPresetContract[] = PETAL_COUNTS.flatMap((petals) => [
  {
    id: `inspin-${petals}`,
    label: `${petals}-Petal Inspin`,
    mode: "inspin" as const,
    petals
  },
  {
    id: `antispin-${petals}`,
    label: `${petals}-Petal Antispin`,
    mode: "antispin" as const,
    petals
  }
]);

function cloneState(state: AppState): AppState {
  return {
    global: { ...state.global },
    hands: {
      L: { ...state.hands.L },
      R: { ...state.hands.R }
    }
  };
}

function getSignedValueWithMagnitude(source: number, magnitude: number): number {
  const sourceSign = Math.sign(source) || 1;
  return sourceSign * magnitude;
}

function applyArmRelationPreset(hands: HandsState, preset: ElementPresetContract): HandsState {
  const leftArmSpeedMagnitude = Math.abs(hands.L.armSpeed);
  const rightArmSpeedWithLeftDirection = getSignedValueWithMagnitude(hands.L.armSpeed, leftArmSpeedMagnitude);
  const rightArmSpeed = preset.sameDirection ? rightArmSpeedWithLeftDirection : -rightArmSpeedWithLeftDirection;
  const phaseOffset = preset.sameTime ? SAME_TIME_PHASE_OFFSET : SPLIT_TIME_PHASE_OFFSET;

  return {
    L: { ...hands.L },
    R: {
      ...hands.R,
      armSpeed: rightArmSpeed,
      armPhase: hands.L.armPhase + phaseOffset
    }
  };
}

function applyFlowerPreset(hands: HandsState, mode: FlowerMode, petals: FlowerPetalCount): HandsState {
  const modeMultiplier = mode === "inspin" ? 1 : -1;
  const speedMultiplier = modeMultiplier * petals;

  return {
    L: {
      ...hands.L,
      poiSpeed: speedMultiplier * hands.L.armSpeed,
      poiPhase: 0
    },
    R: {
      ...hands.R,
      poiSpeed: speedMultiplier * hands.R.armSpeed,
      poiPhase: 0
    }
  };
}

export function applyElementPreset(state: AppState, id: ElementPresetId): AppState {
  const preset = ELEMENT_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    return cloneState(state);
  }

  const cloned = cloneState(state);
  return {
    ...cloned,
    hands: applyArmRelationPreset(cloned.hands, preset)
  };
}

export function applyFlowerModePreset(state: AppState, mode: FlowerMode, petals: FlowerPetalCount): AppState {
  const cloned = cloneState(state);
  return {
    ...cloned,
    hands: applyFlowerPreset(cloned.hands, mode, petals)
  };
}

function createElementPresetDefinition(preset: ElementPresetContract): PresetDefinition {
  return {
    id: preset.id,
    label: preset.label,
    apply: (state) => applyElementPreset(state, preset.id)
  };
}

function createFlowerPresetDefinition(preset: FlowerPresetContract): PresetDefinition {
  return {
    id: preset.id,
    label: preset.label,
    apply: (state) => applyFlowerModePreset(state, preset.mode, preset.petals)
  };
}

export const PRESET_CATALOG: PresetDefinition[] = [
  ...ELEMENT_PRESETS.map(createElementPresetDefinition),
  ...FLOWER_PRESETS.map(createFlowerPresetDefinition)
];

export function applyPresetById(state: AppState, id: PresetId): AppState {
  const preset = PRESET_CATALOG.find((entry) => entry.id === id);
  if (!preset) {
    return cloneState(state);
  }
  return preset.apply(state);
}
