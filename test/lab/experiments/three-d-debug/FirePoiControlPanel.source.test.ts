import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const FIRE_POI_PANEL_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/FirePoiControlPanel.vue"
);

describe("FirePoiControlPanel source", () => {
  it("wraps the controls in the shared FloatingPanel", () => {
    const source = readFileSync(FIRE_POI_PANEL_FILE, "utf8");

    expect(source).toContain("<FloatingPanel");
    expect(source).toContain('storage-key="poi-v2:three-d-debug-fire-poi-panel"');
  });

  it("renders the expected fire tuning controls", () => {
    const source = readFileSync(FIRE_POI_PANEL_FILE, "utf8");

    expect(source).toContain("Core Intensity");
    expect(source).toContain("Core Radius");
    expect(source).toContain("Wake Length");
    expect(source).toContain("Emission Density");
    expect(source).toContain("Turbulence");
    expect(source).toContain("Spread");
    expect(source).toContain("Fade Rate");
    expect(source).toContain("Velocity Stretch");
    expect(source).toContain("Reset Defaults");
  });

  it("delegates partial update payloads through the task 3 state helper", () => {
    const source = readFileSync(FIRE_POI_PANEL_FILE, "utf8");

    expect(source).toContain("mergeFirePoiSettingsPatch");
  });

  it("emission density and core radius sliders support extended max ranges", () => {
    const source = readFileSync(FIRE_POI_PANEL_FILE, "utf8");

    expect(source).toMatch(/Emission Density[\s\S]*?max="20"/);
    expect(source).toMatch(/Core Radius[\s\S]*?max="0\.40"/);
  });
});
