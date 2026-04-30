export interface PanelPosition {
  readonly x: number;
  readonly y: number;
}

export interface PanelSize {
  readonly width: number;
  readonly height: number;
}

export function clampPanelPosition(
  position: PanelPosition,
  viewport: PanelSize,
  panel: PanelSize,
  margin: number
): PanelPosition {
  const safeMargin = Number.isFinite(margin) && margin >= 0 ? margin : 0;
  const maxX = Math.max(safeMargin, viewport.width - panel.width - safeMargin);
  const maxY = Math.max(safeMargin, viewport.height - panel.height - safeMargin);

  const x = Number.isFinite(position.x) ? position.x : safeMargin;
  const y = Number.isFinite(position.y) ? position.y : safeMargin;

  return {
    x: Math.min(Math.max(x, safeMargin), maxX),
    y: Math.min(Math.max(y, safeMargin), maxY)
  };
}
