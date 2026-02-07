import type { AppState } from "@/types/state";
import { degreesToRadians, radiansToDegrees, type AngleUnit } from "@/state/angleUnits";
import { deserializeState, PERSISTED_STATE_SCHEMA_VERSION } from "@/state/persistence";
import { speedFromRadiansPerBeat, speedToRadiansPerBeat, type SpeedUnit } from "@/state/speedUnits";

export const PRESET_LIBRARY_STORAGE_KEY = "poi-phase-visualiser-preset-library";
export const PRESET_LIBRARY_SCHEMA_VERSION = 1;
export const PRESET_FILE_SCHEMA_VERSION = 2;
export const PRESET_NAME_MAX_LENGTH = 80;
const DEFAULT_PRESET_NAME = "Untitled Preset";

export interface UserPresetRecord {
  id: string;
  name: string;
  savedAt: string;
  state: AppState;
}

export interface UserPresetSummary {
  id: string;
  name: string;
  savedAt: string;
}

interface UserPresetLibraryPayload {
  schemaVersion: number;
  presets: UserPresetRecord[];
}

interface UserPresetFilePayload {
  schemaVersion: number;
  preset: unknown;
}

interface PresetFileUnits {
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}

interface PresetFileState {
  global: AppState["global"];
  hands: AppState["hands"];
}

interface PresetFileRecord {
  id: string;
  name: string;
  savedAt: string;
  units: PresetFileUnits;
  state: PresetFileState;
}

export interface PresetFileExportOptions {
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSpeedUnit(value: unknown): value is SpeedUnit {
  return value === "cycles" || value === "degrees";
}

function isAngleUnit(value: unknown): value is AngleUnit {
  return value === "degrees" || value === "radians";
}

function cloneState(state: AppState): AppState {
  return {
    global: { ...state.global },
    hands: {
      L: { ...state.hands.L },
      R: { ...state.hands.R }
    }
  };
}

function convertPhaseFromInternalForExport(valueRadians: number, phaseUnit: AngleUnit): number {
  if (phaseUnit === "radians") {
    return valueRadians;
  }
  return radiansToDegrees(valueRadians);
}

function convertPhaseFromExportToInternal(value: number, phaseUnit: AngleUnit): number {
  if (phaseUnit === "radians") {
    return value;
  }
  return degreesToRadians(value);
}

function convertStateForExport(state: AppState, options: PresetFileExportOptions): PresetFileState {
  return {
    global: { ...state.global },
    hands: {
      L: {
        armSpeed: speedFromRadiansPerBeat(state.hands.L.armSpeed, options.speedUnit),
        armPhase: convertPhaseFromInternalForExport(state.hands.L.armPhase, options.phaseUnit),
        armRadius: state.hands.L.armRadius,
        poiSpeed: speedFromRadiansPerBeat(state.hands.L.poiSpeed, options.speedUnit),
        poiPhase: convertPhaseFromInternalForExport(state.hands.L.poiPhase, options.phaseUnit),
        poiRadius: state.hands.L.poiRadius
      },
      R: {
        armSpeed: speedFromRadiansPerBeat(state.hands.R.armSpeed, options.speedUnit),
        armPhase: convertPhaseFromInternalForExport(state.hands.R.armPhase, options.phaseUnit),
        armRadius: state.hands.R.armRadius,
        poiSpeed: speedFromRadiansPerBeat(state.hands.R.poiSpeed, options.speedUnit),
        poiPhase: convertPhaseFromInternalForExport(state.hands.R.poiPhase, options.phaseUnit),
        poiRadius: state.hands.R.poiRadius
      }
    }
  };
}

function convertExportStateToInternal(candidate: unknown, units: PresetFileUnits): unknown | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const globalRecord = isRecord(candidate.global) ? candidate.global : null;
  const handsRecord = isRecord(candidate.hands) ? candidate.hands : null;
  if (!globalRecord || !handsRecord) {
    return null;
  }

  const leftHandRecord = isRecord(handsRecord.L) ? handsRecord.L : null;
  const rightHandRecord = isRecord(handsRecord.R) ? handsRecord.R : null;
  if (!leftHandRecord || !rightHandRecord) {
    return null;
  }

  const convertSpeed = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return speedToRadiansPerBeat(value, units.speedUnit);
  };

  const convertPhase = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return convertPhaseFromExportToInternal(value, units.phaseUnit);
  };

  const convertPlainNumber = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return value;
  };

  const mappedLeft = {
    armSpeed: convertSpeed(leftHandRecord.armSpeed),
    armPhase: convertPhase(leftHandRecord.armPhase),
    armRadius: convertPlainNumber(leftHandRecord.armRadius),
    poiSpeed: convertSpeed(leftHandRecord.poiSpeed),
    poiPhase: convertPhase(leftHandRecord.poiPhase),
    poiRadius: convertPlainNumber(leftHandRecord.poiRadius)
  };

  const mappedRight = {
    armSpeed: convertSpeed(rightHandRecord.armSpeed),
    armPhase: convertPhase(rightHandRecord.armPhase),
    armRadius: convertPlainNumber(rightHandRecord.armRadius),
    poiSpeed: convertSpeed(rightHandRecord.poiSpeed),
    poiPhase: convertPhase(rightHandRecord.poiPhase),
    poiRadius: convertPlainNumber(rightHandRecord.poiRadius)
  };

  return {
    global: {
      bpm: convertPlainNumber(globalRecord.bpm),
      loopBeats: convertPlainNumber(globalRecord.loopBeats),
      playSpeed: convertPlainNumber(globalRecord.playSpeed),
      isPlaying: typeof globalRecord.isPlaying === "boolean" ? globalRecord.isPlaying : null,
      t: convertPlainNumber(globalRecord.t),
      showTrails: typeof globalRecord.showTrails === "boolean" ? globalRecord.showTrails : null,
      trailBeats: convertPlainNumber(globalRecord.trailBeats),
      trailSampleHz: convertPlainNumber(globalRecord.trailSampleHz),
      showWaves: typeof globalRecord.showWaves === "boolean" ? globalRecord.showWaves : null
    },
    hands: {
      L: mappedLeft,
      R: mappedRight
    }
  };
}

export function sanitizePresetName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return DEFAULT_PRESET_NAME;
  }
  if (trimmed.length <= PRESET_NAME_MAX_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, PRESET_NAME_MAX_LENGTH);
}

function sanitizeFileSegment(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createPresetFileName(name: string): string {
  const segment = sanitizeFileSegment(name);
  const safeSegment = segment.length > 0 ? segment : "preset";
  return `${safeSegment}.json`;
}

export function createUserPresetSummary(record: UserPresetRecord): UserPresetSummary {
  return {
    id: record.id,
    name: record.name,
    savedAt: record.savedAt
  };
}

function createPresetIdSegment(name: string): string {
  const safeSegment = sanitizeFileSegment(name);
  return safeSegment.length > 0 ? safeSegment : "preset";
}

export function createPresetId(name: string, nowDate = new Date()): string {
  return `preset-${createPresetIdSegment(name)}-${nowDate.getTime()}`;
}

export function ensureUniquePresetId(records: UserPresetRecord[], baseId: string): string {
  const existingIds = new Set(records.map((record) => record.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export function createUserPresetRecord(
  name: string,
  state: AppState,
  nowDate = new Date(),
  presetId?: string
): UserPresetRecord {
  const nowIso = nowDate.toISOString();
  const id = presetId ?? createPresetId(name, nowDate);

  return {
    id,
    name: sanitizePresetName(name),
    savedAt: nowIso,
    state: cloneState(state)
  };
}

function sortBySavedAtDescending(records: UserPresetRecord[]): UserPresetRecord[] {
  return [...records].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function upsertUserPreset(records: UserPresetRecord[], record: UserPresetRecord): UserPresetRecord[] {
  const withoutExisting = records.filter((entry) => entry.id !== record.id);
  return sortBySavedAtDescending([...withoutExisting, { ...record, state: cloneState(record.state) }]);
}

export function removeUserPreset(records: UserPresetRecord[], presetId: string): UserPresetRecord[] {
  return records.filter((entry) => entry.id !== presetId);
}

export function getUserPreset(records: UserPresetRecord[], presetId: string): UserPresetRecord | null {
  return records.find((entry) => entry.id === presetId) ?? null;
}

export function serializeUserPresetLibrary(records: UserPresetRecord[]): string {
  const payload: UserPresetLibraryPayload = {
    schemaVersion: PRESET_LIBRARY_SCHEMA_VERSION,
    presets: records.map((record) => ({
      ...record,
      state: cloneState(record.state)
    }))
  };

  return JSON.stringify(payload);
}

function parsePresetCandidate(rawPreset: unknown, defaults: AppState): UserPresetRecord | null {
  if (!isRecord(rawPreset)) {
    return null;
  }

  if (!isNonEmptyString(rawPreset.id)) {
    return null;
  }

  const name = isNonEmptyString(rawPreset.name) ? sanitizePresetName(rawPreset.name) : DEFAULT_PRESET_NAME;
  const savedAt = isNonEmptyString(rawPreset.savedAt) ? rawPreset.savedAt : new Date(0).toISOString();
  const stateCandidate = rawPreset.state;

  const state = deserializeState(
    JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
      state: stateCandidate
    }),
    defaults
  );

  if (!state) {
    return null;
  }

  return {
    id: rawPreset.id,
    name,
    savedAt,
    state
  };
}

function parsePresetCandidateV2(rawPreset: unknown, defaults: AppState): UserPresetRecord | null {
  if (!isRecord(rawPreset)) {
    return null;
  }

  if (!isNonEmptyString(rawPreset.id)) {
    return null;
  }

  const name = isNonEmptyString(rawPreset.name) ? sanitizePresetName(rawPreset.name) : DEFAULT_PRESET_NAME;
  const savedAt = isNonEmptyString(rawPreset.savedAt) ? rawPreset.savedAt : new Date(0).toISOString();
  const unitsRecord = isRecord(rawPreset.units) ? rawPreset.units : null;
  if (!unitsRecord) {
    return null;
  }

  const speedUnit = isSpeedUnit(unitsRecord.speedUnit) ? unitsRecord.speedUnit : null;
  const phaseUnit = isAngleUnit(unitsRecord.phaseUnit) ? unitsRecord.phaseUnit : null;
  if (!speedUnit || !phaseUnit) {
    return null;
  }

  const convertedState = convertExportStateToInternal(rawPreset.state, { speedUnit, phaseUnit });
  if (!convertedState) {
    return null;
  }

  const state = deserializeState(
    JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
      state: convertedState
    }),
    defaults
  );

  if (!state) {
    return null;
  }

  return {
    id: rawPreset.id,
    name,
    savedAt,
    state
  };
}

export function deserializeUserPresetLibrary(serialized: string | null, defaults: AppState): UserPresetRecord[] {
  if (!serialized) {
    return [];
  }

  try {
    const raw = JSON.parse(serialized) as unknown;
    if (!isRecord(raw)) {
      return [];
    }

    if (raw.schemaVersion !== PRESET_LIBRARY_SCHEMA_VERSION) {
      return [];
    }

    const rawPresets = raw.presets;
    if (!Array.isArray(rawPresets)) {
      return [];
    }

    const parsed = rawPresets
      .map((entry) => parsePresetCandidate(entry, defaults))
      .filter((entry): entry is UserPresetRecord => entry !== null);

    return sortBySavedAtDescending(parsed);
  } catch {
    return [];
  }
}

export function serializeUserPresetFile(record: UserPresetRecord, options: PresetFileExportOptions): string {
  const payload: PresetFileRecord = {
    id: record.id,
    name: record.name,
    savedAt: record.savedAt,
    units: {
      speedUnit: options.speedUnit,
      phaseUnit: options.phaseUnit
    },
    state: convertStateForExport(record.state, options)
  };

  return JSON.stringify(
    {
      schemaVersion: PRESET_FILE_SCHEMA_VERSION,
      preset: payload
    },
    null,
    2
  );
}

export function deserializeUserPresetFile(serialized: string, defaults: AppState): UserPresetRecord | null {
  try {
    const payload = JSON.parse(serialized) as unknown;
    if (!isRecord(payload)) {
      return null;
    }

    const payloadWithSchema = payload as UserPresetFilePayload;
    if (payloadWithSchema.schemaVersion === PRESET_LIBRARY_SCHEMA_VERSION) {
      return parsePresetCandidate(payloadWithSchema.preset, defaults);
    }
    if (payloadWithSchema.schemaVersion === PRESET_FILE_SCHEMA_VERSION) {
      return parsePresetCandidateV2(payloadWithSchema.preset, defaults);
    }
    return null;
  } catch {
    return null;
  }
}
