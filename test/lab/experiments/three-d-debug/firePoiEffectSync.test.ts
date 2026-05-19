import { describe, expect, it, vi } from "vitest";

import { syncRecoverableFirePoiEffect } from "@/lab/experiments/three-d-debug/firePoiEffectSync";

describe("syncRecoverableFirePoiEffect", () => {
  it("disposes a failed overlay attempt and allows a later sync to recover", () => {
    const scene = { id: "scene" };
    const input = { enabled: true };
    const firstController = {
      sync: vi.fn(() => {
        throw new Error("fire sync failed");
      }),
      dispose: vi.fn()
    };
    const recoveredController = {
      sync: vi.fn(),
      dispose: vi.fn()
    };
    const createController = vi
      .fn<() => typeof firstController | typeof recoveredController>()
      .mockReturnValueOnce(firstController)
      .mockReturnValueOnce(recoveredController);
    const renderScene = vi.fn();

    const failedController = syncRecoverableFirePoiEffect({
      scene,
      controller: null,
      createController,
      input,
      renderScene
    });

    expect(failedController).toBeNull();
    expect(firstController.sync).toHaveBeenCalledWith(scene, input);
    expect(firstController.dispose).toHaveBeenCalledWith(scene);
    expect(renderScene).toHaveBeenCalledTimes(1);

    const recovered = syncRecoverableFirePoiEffect({
      scene,
      controller: failedController,
      createController,
      input,
      renderScene
    });

    expect(recovered).toBe(recoveredController);
    expect(recoveredController.sync).toHaveBeenCalledWith(scene, input);
    expect(recoveredController.dispose).not.toHaveBeenCalled();
    expect(createController).toHaveBeenCalledTimes(2);
    expect(renderScene).toHaveBeenCalledTimes(2);
  });
});
