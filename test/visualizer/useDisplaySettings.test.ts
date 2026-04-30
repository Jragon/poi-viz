import { ref } from "vue";

import type { RigId } from "@/engine/types";
import {
  createDisplaySettingsController,
  DISPLAY_SETTINGS_STORAGE_KEY,
  normalizeHexColor,
  type StorageLike
} from "@/visualizer/useDisplaySettings";
import { describe, expect, it } from "vitest";

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

function storedSnapshot(storage: MemoryStorage, key = DISPLAY_SETTINGS_STORAGE_KEY) {
  return JSON.parse(storage.getItem(key) ?? "null") as Record<string, unknown>;
}

describe("useDisplaySettings", () => {
  it("uses code defaults for missing sparse preset fields", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      DISPLAY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        presets: {
          normal: {
            displayScale: 1.75,
            overlaySettings: {
              geometry: {
                trailLineWidth: 8
              },
              unknownBranch: {
                stale: true
              }
            }
          }
        }
      })
    );

    const controller = createDisplaySettingsController({ rigOrder: ["left"], storage });

    expect(controller.displayScale.value).toBe(1.75);
    expect(controller.overlaySettings.value.geometry.trailLineWidth).toBe(8);
    expect(controller.overlaySettings.value.geometry.chainLineWidth).toBe(3);
    expect(controller.overlaySettings.value.visibility.showHeadTrails).toBe(true);
  });

  it("persists normal overrides and deletes overrides that match inherited defaults", () => {
    const storage = new MemoryStorage();
    const controller = createDisplaySettingsController({ rigOrder: ["left"], storage });

    controller.setDisplayScale(2);
    controller.setOverlayGeometry("trailLineWidth", 7);
    controller.setOverlayVisibility("showHandTrails", true);

    expect(storedSnapshot(storage)).toMatchObject({
      presets: {
        normal: {
          displayScale: 2,
          overlaySettings: {
            visibility: { showHandTrails: true },
            geometry: { trailLineWidth: 7 }
          }
        }
      }
    });

    controller.setDisplayScale(1);
    controller.setOverlayGeometry("trailLineWidth", 3);
    controller.setOverlayVisibility("showHandTrails", false);

    expect(storedSnapshot(storage)).toMatchObject({
      presets: {
        normal: {},
        webcam: {}
      }
    });
  });

  it("forces webcam while active and resets webcam overrides back to the code seed", () => {
    const storage = new MemoryStorage();
    const controller = createDisplaySettingsController({ rigOrder: ["left"], storage });

    expect(controller.activePresetId.value).toBe("normal");
    expect(controller.overlaySettings.value.geometry.trailLineWidth).toBe(3);

    controller.setWebcamActive(true);

    expect(controller.activePresetId.value).toBe("webcam");
    expect(controller.isWebcamPresetForced.value).toBe(true);
    expect(controller.overlaySettings.value.geometry.trailLineWidth).toBe(5);

    controller.setOverlayGeometry("trailLineWidth", 9);
    expect(controller.overlaySettings.value.geometry.trailLineWidth).toBe(9);
    expect(storedSnapshot(storage)).toMatchObject({
      presets: {
        webcam: {
          overlaySettings: {
            geometry: { trailLineWidth: 9 }
          }
        }
      }
    });

    controller.resetActivePreset();
    expect(controller.overlaySettings.value.geometry.trailLineWidth).toBe(5);
    expect(storedSnapshot(storage)).toMatchObject({
      presets: {
        webcam: {}
      }
    });

    controller.setWebcamActive(false);
    expect(controller.activePresetId.value).toBe("normal");
    expect(controller.overlaySettings.value.geometry.trailLineWidth).toBe(3);
  });

  it("stores rig color overrides per field and normalizes hex colors", () => {
    const storage = new MemoryStorage();
    const controller = createDisplaySettingsController({ rigOrder: ["left"], storage });

    controller.setRigOverlayStyle("left", "handColor", "#AABBCC");

    expect(controller.overlaySettings.value.rigStyles.left?.handColor).toBe("#aabbcc");
    expect(storedSnapshot(storage)).toMatchObject({
      presets: {
        normal: {
          overlaySettings: {
            rigStyles: {
              left: { handColor: "#aabbcc" }
            }
          }
        }
      }
    });

    controller.setRigOverlayStyle("left", "headColor", "not-a-color");
    expect(storedSnapshot(storage)).toMatchObject({
      presets: {
        normal: {
          overlaySettings: {
            rigStyles: {
              left: { handColor: "#aabbcc" }
            }
          }
        }
      }
    });
  });

  it("ignores stale rig ids from persisted snapshots", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      DISPLAY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        presets: {
          normal: {
            overlaySettings: {
              rigStyles: {
                left: { handColor: "#112233" },
                stale: { handColor: "#445566" }
              }
            }
          }
        }
      })
    );

    const controller = createDisplaySettingsController({ rigOrder: ["left"], storage });

    expect(controller.overlaySettings.value.rigStyles.left?.handColor).toBe("#112233");
    expect(controller.overlaySettings.value.rigStyles.stale).toBeUndefined();
  });

  it("keeps external bindings out of persisted display snapshots", () => {
    const storage = new MemoryStorage();
    const trailDecaySteps = ref(100);
    const secondsPerUnit = ref(4);
    const controller = createDisplaySettingsController({
      rigOrder: ["left"],
      storage,
      external: {
        trailDecaySteps: {
          value: trailDecaySteps,
          set: (value) => {
            trailDecaySteps.value = value;
          }
        },
        transportSecondsPerUnit: {
          value: secondsPerUnit,
          set: (value) => {
            secondsPerUnit.value = value;
          }
        }
      }
    });

    controller.external.trailDecaySteps?.set(42);
    controller.external.transportSecondsPerUnit?.set(2.5);
    controller.setDisplayScale(1.5);

    expect(trailDecaySteps.value).toBe(42);
    expect(secondsPerUnit.value).toBe(2.5);
    expect(JSON.stringify(storedSnapshot(storage))).not.toContain("trailDecaySteps");
    expect(JSON.stringify(storedSnapshot(storage))).not.toContain("transportSecondsPerUnit");
  });

  it("exposes registry ownership for preset and external settings", () => {
    const controller = createDisplaySettingsController({ rigOrder: ["left"], storage: null });
    const ownershipById = Object.fromEntries(
      controller.registry.map((entry) => [entry.id, entry.ownership])
    );

    expect(ownershipById.displayScale).toBe("preset");
    expect(ownershipById.trailDecaySteps).toBe("external");
    expect(ownershipById.transportSecondsPerUnit).toBe("external");
  });

  it("normalizes only lowercaseable six-digit hex colors", () => {
    expect(normalizeHexColor("#ABCDEF")).toBe("#abcdef");
    expect(normalizeHexColor("#abc")).toBeNull();
    expect(normalizeHexColor("rgba(0,0,0,0.5)")).toBeNull();
  });

  it("tracks reactive rig order when building effective settings", () => {
    const rigOrder = ref<readonly RigId[]>(["left"]);
    const controller = createDisplaySettingsController({ rigOrder, storage: null });

    expect(Object.keys(controller.overlaySettings.value.rigStyles)).toEqual(["left"]);

    rigOrder.value = ["left", "right"];

    expect(Object.keys(controller.overlaySettings.value.rigStyles)).toEqual(["left", "right"]);
  });
});
