import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from "vue";

import type { ProjectionModePreference } from "@/engine/planeProjection";
import type { RigId } from "@/engine/types";
import {
  cloneOverlaySettings,
  createDefaultOverlaySettings,
  createWebcamOverlaySettings,
  type EditableRigRenderStyle,
  type OverlayGeometryKey,
  type OverlayGeometrySettings,
  type OverlayLayerVisibility,
  type RigOverlayStyleKey,
  type VisualizerOverlaySettings
} from "@/visualizer/overlaySettings";
import type { TrailLoopMode } from "@/visualizer/useMultiRigPlayback";

export const DISPLAY_SETTINGS_STORAGE_KEY = "poi-v2:visualizer-display";
export const DISPLAY_SCALE_MIN = 0.25;
export const DISPLAY_SCALE_MAX = 4;
export const DISPLAY_SCALE_STEP = 0.05;

export type BuiltInDisplayPresetId = "normal" | "webcam";
export type DisplaySettingOwnership = "preset" | "external";
export type DisplaySettingKind = "boolean" | "range" | "color" | "select";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DisplaySettings {
  displayScale: number;
  overlaySettings: VisualizerOverlaySettings;
}

export interface OverlaySettingsOverrides {
  visibility?: Partial<OverlayLayerVisibility>;
  geometry?: Partial<OverlayGeometrySettings>;
  rigStyles?: Partial<Record<RigId, Partial<EditableRigRenderStyle>>>;
}

export interface DisplayPresetOverrides {
  displayScale?: number;
  overlaySettings?: OverlaySettingsOverrides;
}

interface DisplaySettingsSnapshot {
  presets?: Partial<Record<BuiltInDisplayPresetId, DisplayPresetOverrides>>;
}

export interface DisplayNumberBinding {
  readonly value: Ref<number> | ComputedRef<number>;
  set: (value: number) => void;
}

export interface DisplayBooleanBinding {
  readonly value: Ref<boolean> | ComputedRef<boolean>;
  set: (value: boolean) => void;
}

export interface DisplayTrailLoopBinding {
  readonly value: Ref<TrailLoopMode> | ComputedRef<TrailLoopMode>;
  set: (value: TrailLoopMode) => void;
}

export interface DisplayProjectionModeBinding {
  readonly value: Ref<ProjectionModePreference> | ComputedRef<ProjectionModePreference>;
  set: (value: ProjectionModePreference) => void;
}

export interface ExternalDisplaySettingBindings {
  trailDecaySteps?: DisplayNumberBinding;
  trailLoopMode?: DisplayTrailLoopBinding;
  transportSecondsPerUnit?: DisplayNumberBinding;
  projectionMode?: DisplayProjectionModeBinding;
  projectionYawDeg?: DisplayNumberBinding;
  projectionPitchDeg?: DisplayNumberBinding;
  planeSideSeparationWorld?: DisplayNumberBinding;
}

export interface DisplaySettingsOptions {
  rigOrder: MaybeRefOrGetter<readonly RigId[]>;
  storage?: StorageLike | null;
  storageKey?: string;
  external?: ExternalDisplaySettingBindings;
}

interface BaseSettingRegistryEntry {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly kind: DisplaySettingKind;
  readonly ownership: DisplaySettingOwnership;
}

export interface RangeSettingRegistryEntry extends BaseSettingRegistryEntry {
  readonly kind: "range";
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly digits: number;
}

export interface BooleanSettingRegistryEntry extends BaseSettingRegistryEntry {
  readonly kind: "boolean";
}

export interface ColorSettingRegistryEntry extends BaseSettingRegistryEntry {
  readonly kind: "color";
}

export interface SelectSettingRegistryEntry extends BaseSettingRegistryEntry {
  readonly kind: "select";
  readonly options: readonly string[];
}

export type SettingRegistryEntry =
  | RangeSettingRegistryEntry
  | BooleanSettingRegistryEntry
  | ColorSettingRegistryEntry
  | SelectSettingRegistryEntry;

export const DISPLAY_SCALE_SETTING: RangeSettingRegistryEntry = {
  id: "displayScale",
  label: "Display Scale",
  group: "Display",
  kind: "range",
  ownership: "preset",
  min: DISPLAY_SCALE_MIN,
  max: DISPLAY_SCALE_MAX,
  step: DISPLAY_SCALE_STEP,
  digits: 2
};

export const OVERLAY_VISIBILITY_SETTINGS: readonly (BooleanSettingRegistryEntry & {
  key: keyof OverlayLayerVisibility;
})[] = [
  {
    id: "overlay.visibility.showHandTrails",
    key: "showHandTrails",
    label: "Hand Trails",
    group: "Layers",
    kind: "boolean",
    ownership: "preset"
  },
  {
    id: "overlay.visibility.showHeadTrails",
    key: "showHeadTrails",
    label: "Head Trails",
    group: "Layers",
    kind: "boolean",
    ownership: "preset"
  },
  {
    id: "overlay.visibility.showChainLines",
    key: "showChainLines",
    label: "Chain Lines",
    group: "Layers",
    kind: "boolean",
    ownership: "preset"
  },
  {
    id: "overlay.visibility.showNodeMarkers",
    key: "showNodeMarkers",
    label: "Node Markers",
    group: "Layers",
    kind: "boolean",
    ownership: "preset"
  },
  {
    id: "overlay.visibility.showBodyRig",
    key: "showBodyRig",
    label: "Body Rig",
    group: "Layers",
    kind: "boolean",
    ownership: "preset"
  }
];

export const OVERLAY_GEOMETRY_SETTINGS: readonly (RangeSettingRegistryEntry & {
  key: OverlayGeometryKey;
})[] = [
  {
    id: "overlay.geometry.trailLineWidth",
    key: "trailLineWidth",
    label: "Trail Thickness",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 1,
    max: 16,
    step: 0.5,
    digits: 1
  },
  {
    id: "overlay.geometry.chainLineWidth",
    key: "chainLineWidth",
    label: "Chain Thickness",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 1,
    max: 16,
    step: 0.5,
    digits: 1
  },
  {
    id: "overlay.geometry.handRadius",
    key: "handRadius",
    label: "Hand Size",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 2,
    max: 24,
    step: 1,
    digits: 0
  },
  {
    id: "overlay.geometry.headRadius",
    key: "headRadius",
    label: "Head Size",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 2,
    max: 30,
    step: 1,
    digits: 0
  },
  {
    id: "overlay.geometry.nodeStrokeWidth",
    key: "nodeStrokeWidth",
    label: "Node Stroke",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 0,
    max: 8,
    step: 0.5,
    digits: 1
  },
  {
    id: "overlay.geometry.trailMinOpacity",
    key: "trailMinOpacity",
    label: "Trail Opacity Floor",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 0,
    max: 1,
    step: 0.05,
    digits: 2
  },
  {
    id: "overlay.geometry.bodyLineWidth",
    key: "bodyLineWidth",
    label: "Body Thickness",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 1,
    max: 24,
    step: 0.5,
    digits: 1
  },
  {
    id: "overlay.geometry.bodySecondaryLineWidth",
    key: "bodySecondaryLineWidth",
    label: "Body Detail Thickness",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 1,
    max: 18,
    step: 0.5,
    digits: 1
  },
  {
    id: "overlay.geometry.bodyArmLineWidth",
    key: "bodyArmLineWidth",
    label: "Arm Thickness",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 1,
    max: 24,
    step: 0.5,
    digits: 1
  },
  {
    id: "overlay.geometry.bodyJointRadius",
    key: "bodyJointRadius",
    label: "Body Joint Size",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 0,
    max: 16,
    step: 0.5,
    digits: 1
  },
  {
    id: "overlay.geometry.bodyHeadLineWidth",
    key: "bodyHeadLineWidth",
    label: "Body Head Thickness",
    group: "Geometry",
    kind: "range",
    ownership: "preset",
    min: 1,
    max: 20,
    step: 0.5,
    digits: 1
  }
];

export const RIG_COLOR_SETTINGS: readonly (ColorSettingRegistryEntry & {
  key: RigOverlayStyleKey;
})[] = [
  {
    id: "overlay.rigStyles.*.handColor",
    key: "handColor",
    label: "Hand",
    group: "Rig Colors",
    kind: "color",
    ownership: "preset"
  },
  {
    id: "overlay.rigStyles.*.headColor",
    key: "headColor",
    label: "Head",
    group: "Rig Colors",
    kind: "color",
    ownership: "preset"
  },
  {
    id: "overlay.rigStyles.*.lineColor",
    key: "lineColor",
    label: "Chain",
    group: "Rig Colors",
    kind: "color",
    ownership: "preset"
  },
  {
    id: "overlay.rigStyles.*.handTrailColor",
    key: "handTrailColor",
    label: "Hand Trail",
    group: "Rig Colors",
    kind: "color",
    ownership: "preset"
  },
  {
    id: "overlay.rigStyles.*.headTrailColor",
    key: "headTrailColor",
    label: "Head Trail",
    group: "Rig Colors",
    kind: "color",
    ownership: "preset"
  }
];

export const EXTERNAL_DISPLAY_SETTINGS: readonly SettingRegistryEntry[] = [
  {
    id: "trailDecaySteps",
    label: "Trail Length",
    group: "Session",
    kind: "range",
    ownership: "external",
    min: 2,
    max: 250,
    step: 1,
    digits: 0
  },
  {
    id: "trailLoopMode",
    label: "Loop Continuous Trails",
    group: "Session",
    kind: "boolean",
    ownership: "external"
  },
  {
    id: "projectionMode",
    label: "Projection",
    group: "Projection",
    kind: "select",
    ownership: "external",
    options: ["auto", "orthographic", "tilted"]
  },
  {
    id: "projectionYawDeg",
    label: "Yaw",
    group: "Projection",
    kind: "range",
    ownership: "external",
    min: -60,
    max: 60,
    step: 1,
    digits: 0
  },
  {
    id: "projectionPitchDeg",
    label: "Pitch",
    group: "Projection",
    kind: "range",
    ownership: "external",
    min: -45,
    max: 45,
    step: 1,
    digits: 0
  },
  {
    id: "planeSideSeparationWorld",
    label: "Plane Side Separation",
    group: "Projection",
    kind: "range",
    ownership: "external",
    min: 0,
    max: 0.5,
    step: 0.01,
    digits: 2
  },
  {
    id: "transportSecondsPerUnit",
    label: "Seconds per Time Unit",
    group: "Transport",
    kind: "range",
    ownership: "external",
    min: 0.1,
    max: 10,
    step: 0.05,
    digits: 2
  }
];

export const DISPLAY_SETTING_REGISTRY: readonly SettingRegistryEntry[] = [
  DISPLAY_SCALE_SETTING,
  ...OVERLAY_VISIBILITY_SETTINGS,
  ...OVERLAY_GEOMETRY_SETTINGS,
  ...RIG_COLOR_SETTINGS,
  ...EXTERNAL_DISPLAY_SETTINGS
];

export interface DisplaySettingsController {
  readonly panelOpen: Ref<boolean>;
  readonly activePresetId: ComputedRef<BuiltInDisplayPresetId>;
  readonly isWebcamPresetForced: ComputedRef<boolean>;
  readonly rigOrder: ComputedRef<readonly RigId[]>;
  readonly settings: ComputedRef<DisplaySettings>;
  readonly overlaySettings: ComputedRef<VisualizerOverlaySettings>;
  readonly displayScale: ComputedRef<number>;
  readonly external: ExternalDisplaySettingBindings;
  readonly registry: readonly SettingRegistryEntry[];
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setWebcamActive: (value: boolean) => void;
  setDisplayScale: (value: number) => void;
  setOverlayVisibility: (key: keyof OverlayLayerVisibility, value: boolean) => void;
  setOverlayGeometry: (key: OverlayGeometryKey, value: number) => void;
  setRigOverlayStyle: (rigId: RigId, key: RigOverlayStyleKey, value: string) => void;
  resetActivePreset: () => void;
  resetPreset: (presetId: BuiltInDisplayPresetId) => void;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }

  return globalThis.localStorage;
}

function createDefaultDisplaySettings(rigOrder: readonly RigId[]): DisplaySettings {
  return {
    displayScale: 1,
    overlaySettings: createDefaultOverlaySettings(rigOrder)
  };
}

function createEmptyOverrides(): Record<BuiltInDisplayPresetId, DisplayPresetOverrides> {
  return {
    normal: {},
    webcam: {}
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampNumber(value: number, setting: RangeSettingRegistryEntry): number {
  return Math.min(Math.max(value, setting.min), setting.max);
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(trimmed) ? trimmed : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneOverrides(overrides: DisplayPresetOverrides): DisplayPresetOverrides {
  return {
    ...(overrides.displayScale !== undefined ? { displayScale: overrides.displayScale } : {}),
    ...(overrides.overlaySettings
      ? {
          overlaySettings: {
            ...(overrides.overlaySettings.visibility
              ? { visibility: { ...overrides.overlaySettings.visibility } }
              : {}),
            ...(overrides.overlaySettings.geometry
              ? { geometry: { ...overrides.overlaySettings.geometry } }
              : {}),
            ...(overrides.overlaySettings.rigStyles
              ? {
                  rigStyles: Object.fromEntries(
                    Object.entries(overrides.overlaySettings.rigStyles).map(([rigId, style]) => [
                      rigId,
                      style ? { ...style } : style
                    ])
                  )
                }
              : {})
          }
        }
      : {})
  };
}

function pruneEmptyOverrides(overrides: DisplayPresetOverrides): DisplayPresetOverrides {
  const next = cloneOverrides(overrides);
  const overlay = next.overlaySettings;

  if (overlay?.visibility && Object.keys(overlay.visibility).length === 0) {
    delete overlay.visibility;
  }

  if (overlay?.geometry && Object.keys(overlay.geometry).length === 0) {
    delete overlay.geometry;
  }

  if (overlay?.rigStyles) {
    for (const [rigId, style] of Object.entries(overlay.rigStyles)) {
      if (!style || Object.keys(style).length === 0) {
        delete overlay.rigStyles[rigId];
      }
    }

    if (Object.keys(overlay.rigStyles).length === 0) {
      delete overlay.rigStyles;
    }
  }

  if (overlay && Object.keys(overlay).length === 0) {
    delete next.overlaySettings;
  }

  return next;
}

function applyOverrides(
  settings: DisplaySettings,
  overrides: DisplayPresetOverrides,
  rigOrder: readonly RigId[]
): DisplaySettings {
  const next: DisplaySettings = {
    displayScale: overrides.displayScale ?? settings.displayScale,
    overlaySettings: cloneOverlaySettings(settings.overlaySettings)
  };

  Object.assign(next.overlaySettings.visibility, overrides.overlaySettings?.visibility ?? {});
  Object.assign(next.overlaySettings.geometry, overrides.overlaySettings?.geometry ?? {});

  const activeRigIds = new Set(rigOrder);
  for (const [rigId, styleOverrides] of Object.entries(
    overrides.overlaySettings?.rigStyles ?? {}
  )) {
    if (!activeRigIds.has(rigId) || !styleOverrides) {
      continue;
    }

    const style = next.overlaySettings.rigStyles[rigId];
    if (style) {
      Object.assign(style, styleOverrides);
    }
  }

  return next;
}

function createWebcamSeedOverrides(rigOrder: readonly RigId[]): DisplayPresetOverrides {
  const defaults = createDefaultDisplaySettings(rigOrder);
  const webcam = {
    displayScale: defaults.displayScale,
    overlaySettings: createWebcamOverlaySettings(rigOrder)
  };
  const overrides: DisplayPresetOverrides = {};

  for (const setting of OVERLAY_GEOMETRY_SETTINGS) {
    const defaultValue = defaults.overlaySettings.geometry[setting.key];
    const webcamValue = webcam.overlaySettings.geometry[setting.key];
    if (webcamValue !== defaultValue) {
      overrides.overlaySettings ??= {};
      overrides.overlaySettings.geometry ??= {};
      overrides.overlaySettings.geometry[setting.key] = webcamValue;
    }
  }

  for (const rigId of rigOrder) {
    const defaultStyle = defaults.overlaySettings.rigStyles[rigId];
    const webcamStyle = webcam.overlaySettings.rigStyles[rigId];
    if (!defaultStyle || !webcamStyle) {
      continue;
    }

    for (const setting of RIG_COLOR_SETTINGS) {
      const defaultValue = defaultStyle[setting.key];
      const webcamValue = normalizeHexColor(webcamStyle[setting.key]);
      if (webcamValue && webcamValue !== defaultValue) {
        overrides.overlaySettings ??= {};
        overrides.overlaySettings.rigStyles ??= {};
        overrides.overlaySettings.rigStyles[rigId] ??= {};
        overrides.overlaySettings.rigStyles[rigId][setting.key] = webcamValue;
      }
    }
  }

  return pruneEmptyOverrides(overrides);
}

function inheritedBaseForPreset(
  presetId: BuiltInDisplayPresetId,
  rigOrder: readonly RigId[]
): DisplaySettings {
  const defaults = createDefaultDisplaySettings(rigOrder);
  if (presetId === "normal") {
    return defaults;
  }

  return applyOverrides(defaults, createWebcamSeedOverrides(rigOrder), rigOrder);
}

function parseVisibilityOverrides(value: unknown): Partial<OverlayLayerVisibility> | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const next: Partial<OverlayLayerVisibility> = {};
  for (const setting of OVERLAY_VISIBILITY_SETTINGS) {
    const rawValue = value[setting.key];
    if (typeof rawValue === "boolean") {
      next[setting.key] = rawValue;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function parseGeometryOverrides(value: unknown): Partial<OverlayGeometrySettings> | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const next: Partial<OverlayGeometrySettings> = {};
  for (const setting of OVERLAY_GEOMETRY_SETTINGS) {
    const rawValue = value[setting.key];
    if (isFiniteNumber(rawValue)) {
      next[setting.key] = clampNumber(rawValue, setting);
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function parseRigStyleOverrides(
  value: unknown,
  rigOrder: readonly RigId[]
): Partial<Record<RigId, Partial<EditableRigRenderStyle>>> | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const activeRigIds = new Set(rigOrder);
  const next: Partial<Record<RigId, Partial<EditableRigRenderStyle>>> = {};

  for (const [rigId, rawStyle] of Object.entries(value)) {
    if (!activeRigIds.has(rigId) || !isPlainObject(rawStyle)) {
      continue;
    }

    const style: Partial<EditableRigRenderStyle> = {};
    for (const setting of RIG_COLOR_SETTINGS) {
      const rawValue = rawStyle[setting.key];
      if (typeof rawValue !== "string") {
        continue;
      }

      const normalized = normalizeHexColor(rawValue);
      if (normalized) {
        style[setting.key] = normalized;
      }
    }

    if (Object.keys(style).length > 0) {
      next[rigId] = style;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function parsePresetOverrides(value: unknown, rigOrder: readonly RigId[]): DisplayPresetOverrides {
  if (!isPlainObject(value)) {
    return {};
  }

  const next: DisplayPresetOverrides = {};
  if (isFiniteNumber(value.displayScale)) {
    next.displayScale = clampNumber(value.displayScale, DISPLAY_SCALE_SETTING);
  }

  if (isPlainObject(value.overlaySettings)) {
    const visibility = parseVisibilityOverrides(value.overlaySettings.visibility);
    const geometry = parseGeometryOverrides(value.overlaySettings.geometry);
    const rigStyles = parseRigStyleOverrides(value.overlaySettings.rigStyles, rigOrder);

    if (visibility || geometry || rigStyles) {
      next.overlaySettings = {
        ...(visibility ? { visibility } : {}),
        ...(geometry ? { geometry } : {}),
        ...(rigStyles ? { rigStyles } : {})
      };
    }
  }

  return pruneEmptyOverrides(next);
}

function parseSnapshot(
  raw: string | null,
  rigOrder: readonly RigId[]
): Record<BuiltInDisplayPresetId, DisplayPresetOverrides> {
  const empty = createEmptyOverrides();
  if (!raw) {
    return empty;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DisplaySettingsSnapshot>;
    if (!isPlainObject(parsed.presets)) {
      return empty;
    }

    return {
      normal: parsePresetOverrides(parsed.presets.normal, rigOrder),
      webcam: parsePresetOverrides(parsed.presets.webcam, rigOrder)
    };
  } catch {
    return empty;
  }
}

function createSnapshot(
  overrides: Record<BuiltInDisplayPresetId, DisplayPresetOverrides>
): DisplaySettingsSnapshot {
  return {
    presets: {
      normal: pruneEmptyOverrides(overrides.normal),
      webcam: pruneEmptyOverrides(overrides.webcam)
    }
  };
}

function setNestedOverride<T extends string | number | boolean>(
  overrides: DisplayPresetOverrides,
  baseValue: T,
  nextValue: T,
  assign: () => void,
  clear: () => void
) {
  if (nextValue === baseValue) {
    clear();
    return;
  }

  assign();
}

export function createDisplaySettingsController(
  options: DisplaySettingsOptions
): DisplaySettingsController {
  const rigOrder = computed(() => [...toValue(options.rigOrder)]);
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const storageKey = options.storageKey ?? DISPLAY_SETTINGS_STORAGE_KEY;
  const initialRigOrder = rigOrder.value;
  const overrides = ref<Record<BuiltInDisplayPresetId, DisplayPresetOverrides>>(
    parseSnapshot(storage?.getItem(storageKey) ?? null, initialRigOrder)
  );
  const panelOpen = ref(false);
  const webcamActive = ref(false);
  const activePresetId = computed<BuiltInDisplayPresetId>(() =>
    webcamActive.value ? "webcam" : "normal"
  );
  const isWebcamPresetForced = computed(() => webcamActive.value);

  const persist = () => {
    if (!storage) {
      return;
    }

    storage.setItem(storageKey, JSON.stringify(createSnapshot(overrides.value)));
  };

  const mutateActiveOverrides = (mutate: (preset: DisplayPresetOverrides) => void) => {
    const next = {
      normal: cloneOverrides(overrides.value.normal),
      webcam: cloneOverrides(overrides.value.webcam)
    };
    mutate(next[activePresetId.value]);
    overrides.value = {
      normal: pruneEmptyOverrides(next.normal),
      webcam: pruneEmptyOverrides(next.webcam)
    };
    persist();
  };

  const settings = computed<DisplaySettings>(() => {
    const currentRigOrder = rigOrder.value;
    const defaults = createDefaultDisplaySettings(currentRigOrder);
    if (activePresetId.value === "normal") {
      return applyOverrides(defaults, overrides.value.normal, currentRigOrder);
    }

    const webcamBase = applyOverrides(
      defaults,
      createWebcamSeedOverrides(currentRigOrder),
      currentRigOrder
    );
    return applyOverrides(webcamBase, overrides.value.webcam, currentRigOrder);
  });

  const overlaySettings = computed(() => cloneOverlaySettings(settings.value.overlaySettings));
  const displayScale = computed(() => settings.value.displayScale);

  const openPanel = () => {
    panelOpen.value = true;
  };

  const closePanel = () => {
    panelOpen.value = false;
  };

  const togglePanel = () => {
    panelOpen.value = !panelOpen.value;
  };

  const setWebcamActive = (value: boolean) => {
    webcamActive.value = value;
  };

  const setDisplayScale = (value: number) => {
    if (!isFiniteNumber(value)) {
      return;
    }

    const nextValue = clampNumber(value, DISPLAY_SCALE_SETTING);
    const base = inheritedBaseForPreset(activePresetId.value, rigOrder.value).displayScale;
    mutateActiveOverrides((preset) => {
      setNestedOverride(
        preset,
        base,
        nextValue,
        () => {
          preset.displayScale = nextValue;
        },
        () => {
          delete preset.displayScale;
        }
      );
    });
  };

  const setOverlayVisibility = (key: keyof OverlayLayerVisibility, value: boolean) => {
    const base = inheritedBaseForPreset(activePresetId.value, rigOrder.value).overlaySettings
      .visibility[key];
    mutateActiveOverrides((preset) => {
      preset.overlaySettings ??= {};
      preset.overlaySettings.visibility ??= {};
      setNestedOverride(
        preset,
        base,
        value,
        () => {
          preset.overlaySettings!.visibility![key] = value;
        },
        () => {
          delete preset.overlaySettings?.visibility?.[key];
        }
      );
    });
  };

  const setOverlayGeometry = (key: OverlayGeometryKey, value: number) => {
    const setting = OVERLAY_GEOMETRY_SETTINGS.find((entry) => entry.key === key);
    if (!setting || !isFiniteNumber(value)) {
      return;
    }

    const nextValue = clampNumber(value, setting);
    const base = inheritedBaseForPreset(activePresetId.value, rigOrder.value).overlaySettings
      .geometry[key];
    mutateActiveOverrides((preset) => {
      preset.overlaySettings ??= {};
      preset.overlaySettings.geometry ??= {};
      setNestedOverride(
        preset,
        base,
        nextValue,
        () => {
          preset.overlaySettings!.geometry![key] = nextValue;
        },
        () => {
          delete preset.overlaySettings?.geometry?.[key];
        }
      );
    });
  };

  const setRigOverlayStyle = (rigId: RigId, key: RigOverlayStyleKey, value: string) => {
    if (!rigOrder.value.includes(rigId)) {
      return;
    }

    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    const baseStyle = inheritedBaseForPreset(activePresetId.value, rigOrder.value).overlaySettings
      .rigStyles[rigId];
    const base = baseStyle?.[key];
    if (!base) {
      return;
    }

    mutateActiveOverrides((preset) => {
      preset.overlaySettings ??= {};
      preset.overlaySettings.rigStyles ??= {};
      preset.overlaySettings.rigStyles[rigId] ??= {};
      setNestedOverride(
        preset,
        base,
        normalized,
        () => {
          preset.overlaySettings!.rigStyles![rigId]![key] = normalized;
        },
        () => {
          delete preset.overlaySettings?.rigStyles?.[rigId]?.[key];
        }
      );
    });
  };

  const resetPreset = (presetId: BuiltInDisplayPresetId) => {
    overrides.value = {
      normal: presetId === "normal" ? {} : cloneOverrides(overrides.value.normal),
      webcam: presetId === "webcam" ? {} : cloneOverrides(overrides.value.webcam)
    };
    persist();
  };

  const resetActivePreset = () => {
    resetPreset(activePresetId.value);
  };

  return {
    panelOpen,
    activePresetId,
    isWebcamPresetForced,
    rigOrder,
    settings,
    overlaySettings,
    displayScale,
    external: options.external ?? {},
    registry: DISPLAY_SETTING_REGISTRY,
    openPanel,
    closePanel,
    togglePanel,
    setWebcamActive,
    setDisplayScale,
    setOverlayVisibility,
    setOverlayGeometry,
    setRigOverlayStyle,
    resetActivePreset,
    resetPreset
  };
}
