import type { RigId, Vec2 } from "@/engine/types";

export interface SceneLayoutOptions {
  cssWidth: number;
  cssHeight: number;
  dpr?: number;
  pixelsPerWorldUnit?: number;
  sceneRadiusWorld?: number;
  scenePaddingWorld?: number;
  cameraCenterWorld?: Vec2;
  rigAnchors?: Partial<Record<RigId, Vec2>>;
}

export interface SceneLayout {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly dpr: number;
  readonly pixelsPerWorldUnit: number;
  readonly cameraCenterWorld: Vec2;
  readonly rigAnchors: Partial<Record<RigId, Vec2>>;
}

export const DEFAULT_RIG_ANCHORS: Record<string, Vec2> = {
  left: { x: 0, y: 0 },
  right: { x: 0, y: 0 }
};

export function createSceneLayout(options: SceneLayoutOptions): SceneLayout {
  const dpr = Number.isFinite(options.dpr) && (options.dpr ?? 0) > 0 ? (options.dpr as number) : 1;
  const sceneRadiusWorld =
    Number.isFinite(options.sceneRadiusWorld) && (options.sceneRadiusWorld ?? 0) > 0
      ? (options.sceneRadiusWorld as number)
      : 2;
  const scenePaddingWorld =
    Number.isFinite(options.scenePaddingWorld) && (options.scenePaddingWorld ?? 0) >= 0
      ? (options.scenePaddingWorld as number)
      : 0.35;
  const fittedPixelsPerWorldUnit =
    Math.min(options.cssWidth, options.cssHeight) / (2 * (sceneRadiusWorld + scenePaddingWorld));
  const pixelsPerWorldUnit =
    Number.isFinite(options.pixelsPerWorldUnit) && (options.pixelsPerWorldUnit ?? 0) > 0
      ? (options.pixelsPerWorldUnit as number)
      : fittedPixelsPerWorldUnit;

  return {
    cssWidth: options.cssWidth,
    cssHeight: options.cssHeight,
    canvasWidth: Math.round(options.cssWidth * dpr),
    canvasHeight: Math.round(options.cssHeight * dpr),
    dpr,
    pixelsPerWorldUnit,
    cameraCenterWorld: options.cameraCenterWorld ?? { x: 0, y: 0 },
    rigAnchors: {
      ...DEFAULT_RIG_ANCHORS,
      ...(options.rigAnchors ?? {})
    }
  };
}

export function getRigAnchor(layout: SceneLayout, rigId: RigId): Vec2 {
  return layout.rigAnchors[rigId] ?? { x: 0, y: 0 };
}

export function translatePoint(base: Vec2, delta: Vec2): Vec2 {
  return {
    x: base.x + delta.x,
    y: base.y + delta.y
  };
}

export function worldToCanvas(layout: SceneLayout, point: Vec2): Vec2 {
  return {
    x: layout.cssWidth / 2 + (point.x - layout.cameraCenterWorld.x) * layout.pixelsPerWorldUnit,
    y: layout.cssHeight / 2 - (point.y - layout.cameraCenterWorld.y) * layout.pixelsPerWorldUnit
  };
}
