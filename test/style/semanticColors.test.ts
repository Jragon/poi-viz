import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styleSource = readFileSync(new URL("../../src/style.css", import.meta.url), "utf8");

function token(name: string): string {
  const match = styleSource.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Missing semantic token --${name}`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset + 1, offset + 3), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("semantic UI colors", () => {
  const backgrounds = ["ui-page", "ui-surface", "ui-surface-raised", "ui-input", "ui-stage"];

  it("keeps all text roles at normal-text AA against application surfaces", () => {
    for (const foreground of ["ui-text", "ui-text-secondary", "ui-text-muted"]) {
      for (const background of backgrounds) {
        expect(contrastRatio(token(foreground), token(background))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps focus indicators and essential control borders visible", () => {
    for (const background of [
      "ui-page",
      "ui-surface",
      "ui-surface-raised",
      "ui-input",
      "ui-stage"
    ]) {
      expect(contrastRatio(token("ui-focus"), token(background))).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(token("ui-border-strong"), token(background))).toBeGreaterThanOrEqual(3);
    }
  });
});
