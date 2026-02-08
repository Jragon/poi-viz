import type { Theme } from "@/state/theme";

export interface PatternRenderPalette {
  background: string;
  grid: string;
  axis: string;
  left: string;
  right: string;
}

export interface WaveRenderPalette {
  background: string;
  grid: string;
  label: string;
  cursor: string;
  sin: string;
  cos: string;
}

const DARK_PATTERN_PALETTE: PatternRenderPalette = {
  background: "#000000",
  grid: "#1f2937",
  axis: "#374151",
  left: "#22d3ee",
  right: "#f97316"
};

const LIGHT_PATTERN_PALETTE: PatternRenderPalette = {
  background: "#f8fafc",
  grid: "#cbd5e1",
  axis: "#94a3b8",
  left: "#0891b2",
  right: "#ea580c"
};

const DARK_WAVE_PALETTE: WaveRenderPalette = {
  background: "#030712",
  grid: "#1f2937",
  label: "#9ca3af",
  cursor: "#f43f5e",
  sin: "#22d3ee",
  cos: "#facc15"
};

const LIGHT_WAVE_PALETTE: WaveRenderPalette = {
  background: "#f8fafc",
  grid: "#cbd5e1",
  label: "#475569",
  cursor: "#e11d48",
  sin: "#0891b2",
  cos: "#ca8a04"
};

export function getPatternRenderPalette(theme: Theme): PatternRenderPalette {
  return theme === "light" ? LIGHT_PATTERN_PALETTE : DARK_PATTERN_PALETTE;
}

export function getWaveRenderPalette(theme: Theme): WaveRenderPalette {
  return theme === "light" ? LIGHT_WAVE_PALETTE : DARK_WAVE_PALETTE;
}
