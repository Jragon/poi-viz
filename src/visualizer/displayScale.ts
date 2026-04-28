export interface ComputeDisplayPixelsPerWorldUnitOptions {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly sceneRadiusWorld: number;
  readonly scenePaddingWorld?: number;
  readonly displayScale: number;
}

export function computeDisplayPixelsPerWorldUnit(
  options: ComputeDisplayPixelsPerWorldUnitOptions
): number {
  const sceneRadiusWorld =
    Number.isFinite(options.sceneRadiusWorld) && options.sceneRadiusWorld > 0
      ? options.sceneRadiusWorld
      : 2;
  const scenePaddingWorld =
    Number.isFinite(options.scenePaddingWorld) && (options.scenePaddingWorld ?? 0) >= 0
      ? (options.scenePaddingWorld ?? 0.35)
      : 0.35;
  const displayScale =
    Number.isFinite(options.displayScale) && options.displayScale > 0 ? options.displayScale : 1;
  const fittedPixelsPerWorldUnit =
    Math.min(options.cssWidth, options.cssHeight) / (2 * (sceneRadiusWorld + scenePaddingWorld));

  return fittedPixelsPerWorldUnit * displayScale;
}
