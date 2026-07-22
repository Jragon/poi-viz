import { describe, expect, it, vi } from "vitest";
import { computed, ref, type Ref } from "vue";

import type { CartesianMultiRigPose, MultiRigSequence } from "@/engine/types";
import {
  createPngSequenceExporter,
  PNG_SEQUENCE_MAX_FRAME_COUNT,
  type CanvasFactory,
  type DownloadAdapter,
  type ExportCanvas,
  type PngSequenceExportOptions
} from "@/visualizer/exportPngSequence";
import type { ArchiveSink } from "@/visualizer/exportTar";
import { createDefaultOverlaySettings } from "@/visualizer/overlaySettings";
import type {
  MultiRigPlaybackController,
  MultiRigTrailSamples,
  PlaybackEvaluateResult,
  TrailSamplingOptions
} from "@/visualizer/useMultiRigPlayback";
import { TRAIL_STEP_FIXED } from "@/visualizer/useVisualizerSession";

const textDecoder = new TextDecoder();

const sequence: MultiRigSequence = {
  rigs: [
    {
      rigId: "left",
      sequence: {
        segments: [
          {
            durationUnits: 1,
            hand: {
              startPose: { phaseAbs: 0, radius: 1 },
              driver: { kind: "circle", omega: 1 }
            },
            head: {
              startPose: { phaseAbs: 0, radius: 1 },
              driver: { kind: "circle", omega: 1 }
            }
          }
        ]
      }
    }
  ]
};

class MemoryArchiveSink implements ArchiveSink {
  readonly files: { path: string; body: Blob | Uint8Array }[] = [];
  finalized = false;
  discarded = false;

  async writeFile(path: string, body: Blob | Uint8Array): Promise<void> {
    if (this.finalized) throw new Error("already finalized");
    if (this.discarded) throw new Error("already discarded");
    this.files.push({ path, body });
  }

  async finalize(): Promise<Blob> {
    this.finalized = true;
    return new Blob(["tar"]);
  }

  discard() {
    this.discarded = true;
  }
}

function createMockContext(canvas: { width: number; height: number }) {
  const operations: string[] = [];
  let fillStyle = "";
  let strokeStyle = "";
  let lineWidth = 1;
  const ctx = {
    canvas,
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    clearRect: () => operations.push("clearRect"),
    fillRect: () => operations.push("fillRect"),
    beginPath: () => operations.push("beginPath"),
    moveTo: () => operations.push("moveTo"),
    lineTo: () => operations.push("lineTo"),
    stroke: () => operations.push("stroke"),
    save: () => operations.push("save"),
    restore: () => operations.push("restore"),
    arc: () => operations.push("arc"),
    fill: () => operations.push("fill"),
    fillText: () => operations.push("fillText"),
    setTransform: (...args: number[]) => operations.push(`setTransform:${args.join(",")}`)
  } as Record<string, unknown>;

  Object.defineProperty(ctx, "globalAlpha", {
    get: () => 1,
    set: () => operations.push("globalAlpha")
  });
  Object.defineProperty(ctx, "fillStyle", {
    get: () => fillStyle,
    set: (value: string) => {
      fillStyle = value;
      operations.push(`fillStyle:${value}`);
    }
  });
  Object.defineProperty(ctx, "strokeStyle", {
    get: () => strokeStyle,
    set: (value: string) => {
      strokeStyle = value;
      operations.push(`strokeStyle:${value}`);
    }
  });
  Object.defineProperty(ctx, "lineWidth", {
    get: () => lineWidth,
    set: (value: number) => {
      lineWidth = value;
      operations.push(`lineWidth:${value}`);
    }
  });

  return { ctx: ctx as unknown as CanvasRenderingContext2D, operations };
}

function createCanvasFactory() {
  const canvases: {
    canvas: { width: number; height: number };
    operations: string[];
    released: boolean;
  }[] = [];
  const factory: CanvasFactory = {
    createCanvas(width: number, height: number): ExportCanvas {
      const canvas = { width, height };
      const { ctx, operations } = createMockContext(canvas);
      const record = { canvas, operations, released: false };
      canvases.push(record);
      return {
        ctx,
        encodePng: async () => new Blob([`frame-${canvases.length}-${operations.length}`]),
        release: () => {
          record.released = true;
          canvas.width = 0;
          canvas.height = 0;
        }
      };
    }
  };

  return { factory, canvases };
}

function createPlayback(
  durationUnits: number,
  overrides: Partial<MultiRigPlaybackController> = {}
) {
  const evaluateTimes: number[] = [];
  const trailCalls: {
    t: number;
    dt: number;
    holdSteps?: number;
    options?: TrailSamplingOptions;
  }[] = [];
  const disposed = vi.fn();
  const cartesianPoses: CartesianMultiRigPose = {
    left: {
      handPosition: { x: 0.5, y: 0 },
      headPosition: { x: 1, y: 0 }
    }
  };
  const success = (t: number): PlaybackEvaluateResult => ({
    ok: true,
    evaluatedPoses: {},
    relativePoses: {},
    rawWorldPoses: {
      left: {
        handPosition: { x: 0.5 + t, y: 0, z: 0 },
        headPosition: { x: 1 + t, y: 0, z: 0 },
        planeId: "wall"
      }
    },
    worldPoses: {
      left: {
        handPosition: { x: 0.5 + t, y: 0, z: 0 },
        headPosition: { x: 1 + t, y: 0, z: 0 },
        planeId: "wall"
      }
    },
    cartesianPoses: {
      left: {
        handPosition: { x: 0.5 + t, y: 0 },
        headPosition: { x: 1 + t, y: 0 }
      }
    }
  });

  const playback: MultiRigPlaybackController = {
    prepared: ref({ rigs: [], maxSequenceDuration: durationUnits }) as Ref<never>,
    prepareErrors: ref([]),
    maxSequenceDuration: computed(() => durationUnits),
    lastEvaluation: ref(null),
    evaluate: (t: number) => {
      evaluateTimes.push(t);
      return success(t);
    },
    sampleTrails: (
      t: number,
      dt: number,
      holdSteps?: number,
      options?: TrailSamplingOptions
    ): MultiRigTrailSamples => {
      trailCalls.push({
        t,
        dt,
        ...(holdSteps !== undefined ? { holdSteps } : {}),
        ...(options !== undefined ? { options } : {})
      });
      return {
        left: {
          hand: [
            { x: 0, y: 0 },
            { x: 0.5 + t, y: 0 }
          ],
          head: [
            { x: 0, y: 0 },
            { x: 1 + t, y: 0 }
          ]
        }
      };
    },
    dispose: disposed,
    ...overrides
  };

  return { playback, evaluateTimes, trailCalls, disposed, cartesianPoses };
}

function createOptions(
  overrides: Partial<PngSequenceExportOptions> = {}
): PngSequenceExportOptions {
  return {
    sequence,
    sequenceSummary: "test sequence",
    rigOrder: ["left"],
    sceneWorldRadius: 2,
    displayScale: 1.5,
    trailDecaySteps: 42,
    overlaySettings: createDefaultOverlaySettings(["left"]),
    width: 300,
    height: 200,
    fps: 10,
    ...overrides
  };
}

async function readBlobText(blob: Blob | Uint8Array): Promise<string> {
  if (blob instanceof Uint8Array) return textDecoder.decode(blob);
  return blob.text();
}

describe("createPngSequenceExporter", () => {
  it("exports deterministic frame paths and a manifest without RAF pacing", async () => {
    const archive = new MemoryArchiveSink();
    const { factory, canvases } = createCanvasFactory();
    const playbackResult = createPlayback(0.3);
    const download = vi.fn<DownloadAdapter["download"]>();
    const yieldToBrowser = vi.fn(async () => undefined);
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: factory,
      createPlayback: () => playbackResult.playback,
      downloadAdapter: { download },
      now: () => new Date("2026-04-28T12:34:56Z"),
      yieldToBrowser
    });

    await exporter.start(createOptions());

    expect(exporter.state.status).toBe("done");
    expect(exporter.state.totalFrames).toBe(3);
    expect(exporter.state.framesWritten).toBe(3);
    expect(playbackResult.evaluateTimes).toEqual([0, 0.1, 0.2]);
    expect(playbackResult.trailCalls).toEqual([
      {
        t: 0,
        dt: TRAIL_STEP_FIXED,
        holdSteps: 42,
        options: { loopMode: "auto", loopDuration: 0.3 }
      },
      {
        t: 0.1,
        dt: TRAIL_STEP_FIXED,
        holdSteps: 42,
        options: { loopMode: "auto", loopDuration: 0.3 }
      },
      {
        t: 0.2,
        dt: TRAIL_STEP_FIXED,
        holdSteps: 42,
        options: { loopMode: "auto", loopDuration: 0.3 }
      }
    ]);
    expect(archive.files.map((file) => file.path)).toEqual([
      "frames/frame_00000.png",
      "frames/frame_00001.png",
      "frames/frame_00002.png",
      "manifest.json"
    ]);
    expect(yieldToBrowser).toHaveBeenCalledTimes(3);
    expect(download).toHaveBeenCalledWith(
      expect.any(Blob),
      "poi-overlay-20260428-123456-300x200-10fps.tar"
    );
    expect(playbackResult.disposed).toHaveBeenCalledTimes(1);
    expect(canvases[0].released).toBe(true);
    expect(canvases[0].operations).toContain("setTransform:1,0,0,1,0,0");
    expect(canvases[0].operations).not.toContain("fillRect");

    const manifest = JSON.parse(await readBlobText(archive.files[3].body)) as Record<
      string,
      unknown
    >;
    expect(manifest).toMatchObject({
      fps: 10,
      width: 300,
      height: 200,
      durationUnits: 0.3,
      durationSeconds: 0.3,
      frameCount: 3,
      generatedAt: "2026-04-28T12:34:56.000Z",
      sequenceSummary: "test sequence",
      trailDecaySteps: 42,
      trailLoopMode: "auto",
      displayScale: 1.5,
      overlaySettings: {
        visibility: {
          showHandTrails: false,
          showHeadTrails: true,
          showChainLines: true,
          showNodeMarkers: true
        }
      }
    });
  });

  it("renders and records custom overlay appearance", async () => {
    const archive = new MemoryArchiveSink();
    const { factory, canvases } = createCanvasFactory();
    const playbackResult = createPlayback(0.1);
    const overlaySettings = createDefaultOverlaySettings(["left"]);
    overlaySettings.visibility.showHandTrails = true;
    overlaySettings.visibility.showHeadTrails = false;
    overlaySettings.geometry.trailLineWidth = 7.5;
    overlaySettings.geometry.chainLineWidth = 6;
    overlaySettings.geometry.handRadius = 13;
    overlaySettings.geometry.headRadius = 17;
    overlaySettings.rigStyles.left = {
      handColor: "#223344",
      headColor: "#445566",
      lineColor: "#667788",
      labelColor: "#8899aa",
      handTrailColor: "#aabbcc",
      headTrailColor: "#ddeeff"
    };
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: factory,
      createPlayback: () => playbackResult.playback,
      downloadAdapter: { download: vi.fn() },
      now: () => new Date("2026-04-28T12:34:56Z"),
      yieldToBrowser: async () => undefined
    });

    await exporter.start(createOptions({ overlaySettings }));

    expect(canvases[0].operations).toContain("strokeStyle:#aabbcc");
    expect(canvases[0].operations).toContain("strokeStyle:#667788");
    expect(canvases[0].operations).toContain("lineWidth:7.5");
    expect(canvases[0].operations).toContain("lineWidth:6");
    expect(canvases[0].operations).toContain("fillStyle:#223344");

    const manifest = JSON.parse(await readBlobText(archive.files[1].body)) as Record<
      string,
      unknown
    >;
    expect(manifest).toMatchObject({
      overlaySettings: {
        visibility: { showHeadTrails: false },
        geometry: {
          trailLineWidth: 7.5,
          chainLineWidth: 6,
          handRadius: 13,
          headRadius: 17
        },
        rigStyles: {
          left: {
            handColor: "#223344",
            handTrailColor: "#aabbcc",
            lineColor: "#667788"
          }
        }
      }
    });
  });

  it("passes the selected trail loop mode into trail sampling and the manifest", async () => {
    const archive = new MemoryArchiveSink();
    const { factory } = createCanvasFactory();
    const playbackResult = createPlayback(0.1);
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: factory,
      createPlayback: () => playbackResult.playback,
      downloadAdapter: { download: vi.fn() },
      now: () => new Date("2026-04-28T12:34:56Z"),
      yieldToBrowser: async () => undefined
    });

    await exporter.start(createOptions({ trailLoopMode: "off" }));

    expect(playbackResult.trailCalls).toEqual([
      { t: 0, dt: TRAIL_STEP_FIXED, holdSteps: 42, options: { loopMode: "off", loopDuration: 0.1 } }
    ]);

    const manifest = JSON.parse(await readBlobText(archive.files[1].body)) as Record<
      string,
      unknown
    >;
    expect(manifest).toMatchObject({ trailLoopMode: "off" });
  });

  it("passes projection settings into playback and the manifest", async () => {
    const archive = new MemoryArchiveSink();
    const { factory } = createCanvasFactory();
    const playbackResult = createPlayback(0.1);
    const projectionSettings = { mode: "tilted", yawDeg: -30, pitchDeg: 20 } as const;
    const createPlaybackAdapter = vi.fn(() => playbackResult.playback);
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: factory,
      createPlayback: createPlaybackAdapter,
      downloadAdapter: { download: vi.fn() },
      now: () => new Date("2026-04-28T12:34:56Z"),
      yieldToBrowser: async () => undefined
    });

    await exporter.start(createOptions({ projectionSettings }));

    expect(createPlaybackAdapter).toHaveBeenCalledWith(sequence, projectionSettings);
    const manifest = JSON.parse(await readBlobText(archive.files[1].body)) as Record<
      string,
      unknown
    >;
    expect(manifest).toMatchObject({ projectionSettings });
  });

  it("cancels through AbortSignal without finalizing or downloading", async () => {
    const archive = new MemoryArchiveSink();
    const { factory, canvases } = createCanvasFactory();
    const playbackResult = createPlayback(1);
    const download = vi.fn<DownloadAdapter["download"]>();
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: factory,
      createPlayback: () => playbackResult.playback,
      downloadAdapter: { download },
      yieldToBrowser: async () => exporter.cancel()
    });

    await exporter.start(createOptions({ fps: 10 }));

    expect(exporter.state.status).toBe("cancelled");
    expect(archive.discarded).toBe(true);
    expect(archive.finalized).toBe(false);
    expect(download).not.toHaveBeenCalled();
    expect(playbackResult.disposed).toHaveBeenCalledTimes(1);
    expect(canvases[0].released).toBe(true);
  });

  it("reports evaluation errors without producing a download", async () => {
    const archive = new MemoryArchiveSink();
    const { factory } = createCanvasFactory();
    const playbackResult = createPlayback(1, {
      evaluate: () => ({ ok: false, reason: "INVALID_TIME" })
    });
    const download = vi.fn<DownloadAdapter["download"]>();
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: factory,
      createPlayback: () => playbackResult.playback,
      downloadAdapter: { download },
      yieldToBrowser: async () => undefined
    });

    await exporter.start(createOptions());

    expect(exporter.state.status).toBe("error");
    expect(exporter.state.errorMessage).toBe("Playback evaluation failed: INVALID_TIME");
    expect(archive.discarded).toBe(true);
    expect(download).not.toHaveBeenCalled();
    expect(playbackResult.disposed).toHaveBeenCalledTimes(1);
  });

  it("rejects re-entry while running", async () => {
    const archive = new MemoryArchiveSink();
    const { factory } = createCanvasFactory();
    const playbackResult = createPlayback(1);
    let resolveEncode: () => void = () => {
      throw new Error("encode promise was not created");
    };
    const blockingCanvasFactory: CanvasFactory = {
      createCanvas(width, height) {
        const canvas = factory.createCanvas(width, height);
        return {
          ...canvas,
          encodePng: () =>
            new Promise<Blob>((resolve) => {
              resolveEncode = () => resolve(new Blob(["frame"]));
            })
        };
      }
    };
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: blockingCanvasFactory,
      createPlayback: () => playbackResult.playback,
      downloadAdapter: { download: vi.fn() },
      yieldToBrowser: async () => undefined
    });

    const running = exporter.start(createOptions({ fps: 1 }));
    await expect(exporter.start(createOptions())).rejects.toThrow("already running");
    resolveEncode();
    await running;
  });

  it("fails clearly above the V1 frame count limit", async () => {
    const archive = new MemoryArchiveSink();
    const { factory } = createCanvasFactory();
    const playbackResult = createPlayback(PNG_SEQUENCE_MAX_FRAME_COUNT + 1);
    const exporter = createPngSequenceExporter({
      archiveSinkFactory: () => archive,
      canvasFactory: factory,
      createPlayback: () => playbackResult.playback,
      downloadAdapter: { download: vi.fn() }
    });

    await exporter.start(createOptions({ fps: 1 }));

    expect(exporter.state.status).toBe("error");
    expect(exporter.state.errorMessage).toContain("frame count exceeds");
    expect(archive.discarded).toBe(true);
    expect(playbackResult.disposed).toHaveBeenCalledTimes(1);
  });
});
