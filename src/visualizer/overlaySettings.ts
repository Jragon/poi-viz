import type { RigId } from "@/engine/types";
import { DEFAULT_RIG_STYLES, type RigRenderStyle } from "@/visualizer/drawingTools";
import { DEFAULT_RENDER_FRAME_GEOMETRY, type RenderFrameGeometry } from "@/visualizer/renderFrame";

export interface OverlayLayerVisibility {
  showHandTrails: boolean;
  showHeadTrails: boolean;
  showChainLines: boolean;
  showNodeMarkers: boolean;
}

export type OverlayGeometrySettings = {
  -readonly [Key in keyof RenderFrameGeometry]: RenderFrameGeometry[Key];
};

export type EditableRigRenderStyle = {
  -readonly [Key in keyof RigRenderStyle]: RigRenderStyle[Key];
};

export type OverlayGeometryKey = keyof OverlayGeometrySettings;
export type RigOverlayStyleKey = keyof RigRenderStyle;

export interface VisualizerOverlaySettings {
  visibility: OverlayLayerVisibility;
  geometry: OverlayGeometrySettings;
  rigStyles: Partial<Record<RigId, EditableRigRenderStyle>>;
}

const DEFAULT_VISIBILITY: OverlayLayerVisibility = {
  showHandTrails: true,
  showHeadTrails: true,
  showChainLines: true,
  showNodeMarkers: true
};

function cloneGeometry(
  geometry: RenderFrameGeometry = DEFAULT_RENDER_FRAME_GEOMETRY
): OverlayGeometrySettings {
  return { ...geometry };
}

function cloneVisibility(
  visibility: OverlayLayerVisibility = DEFAULT_VISIBILITY
): OverlayLayerVisibility {
  return { ...visibility };
}

export function defaultRigOverlayStyle(index: number): EditableRigRenderStyle {
  const base = DEFAULT_RIG_STYLES[index % DEFAULT_RIG_STYLES.length];
  return {
    ...base,
    handTrailColor: base.handColor,
    headTrailColor: base.headColor
  };
}

export function createDefaultOverlaySettings(
  rigOrder: readonly RigId[]
): VisualizerOverlaySettings {
  return {
    visibility: cloneVisibility(),
    geometry: cloneGeometry(),
    rigStyles: Object.fromEntries(
      rigOrder.map((rigId, index) => [rigId, defaultRigOverlayStyle(index)])
    )
  };
}

export function cloneOverlaySettings(
  settings: VisualizerOverlaySettings
): VisualizerOverlaySettings {
  return {
    visibility: cloneVisibility(settings.visibility),
    geometry: cloneGeometry(settings.geometry),
    rigStyles: Object.fromEntries(
      Object.entries(settings.rigStyles).map(([rigId, style]) => [
        rigId,
        style ? { ...style } : style
      ])
    )
  };
}

export function syncOverlayRigStyles(
  settings: VisualizerOverlaySettings,
  rigOrder: readonly RigId[]
) {
  const activeRigIds = new Set(rigOrder);

  for (const rigId of Object.keys(settings.rigStyles)) {
    if (!activeRigIds.has(rigId)) {
      delete settings.rigStyles[rigId];
    }
  }

  rigOrder.forEach((rigId, index) => {
    settings.rigStyles[rigId] ??= defaultRigOverlayStyle(index);
  });
}

export function resetOverlaySettings(
  settings: VisualizerOverlaySettings,
  rigOrder: readonly RigId[]
) {
  const defaults = createDefaultOverlaySettings(rigOrder);
  Object.assign(settings.visibility, defaults.visibility);
  Object.assign(settings.geometry, defaults.geometry);

  for (const rigId of Object.keys(settings.rigStyles)) {
    delete settings.rigStyles[rigId];
  }

  Object.assign(settings.rigStyles, defaults.rigStyles);
}
