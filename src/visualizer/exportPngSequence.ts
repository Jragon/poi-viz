import { reactive, type Reactive } from "vue";

import type { MultiRigSequence, RigId } from "@/engine/types";
import { computeDisplayPixelsPerWorldUnit } from "@/visualizer/displayScale";
import { TarArchiveSink, type ArchiveSink } from "@/visualizer/exportTar";
import { cloneOverlaySettings, type VisualizerOverlaySettings } from "@/visualizer/overlaySettings";
import { renderFrame, type RenderFrameOptions } from "@/visualizer/renderFrame";
import { createSceneLayout } from "@/visualizer/sceneLayout";
import {
  useMultiRigPlayback,
  type MultiRigPlaybackController,
  type TrailLoopMode
} from "@/visualizer/useMultiRigPlayback";
import { TRAIL_STEP_FIXED } from "@/visualizer/useVisualizerSession";

export const PNG_SEQUENCE_EXPORT_WIDTH = 1920;
export const PNG_SEQUENCE_EXPORT_HEIGHT = 1080;
export const PNG_SEQUENCE_EXPORT_FPS = 60;
export const PNG_SEQUENCE_MAX_FRAME_COUNT = 99_999;

export type ExportStatus = "idle" | "running" | "done" | "error" | "cancelled";

export interface PngSequenceExportState {
  status: ExportStatus;
  framesWritten: number;
  totalFrames: number;
  errorMessage: string | null;
}

export interface PngSequenceExportOptions {
  readonly sequence: MultiRigSequence;
  readonly sequenceSummary: string;
  readonly rigOrder: readonly RigId[];
  readonly sceneWorldRadius: number;
  readonly displayScale: number;
  readonly trailDecaySteps: number;
  readonly trailLoopMode?: TrailLoopMode;
  readonly overlaySettings: VisualizerOverlaySettings;
  readonly width?: number;
  readonly height?: number;
  readonly fps?: number;
}

export interface ExportCanvas {
  readonly ctx: CanvasRenderingContext2D;
  encodePng: () => Promise<Blob>;
  release: () => void;
}

export interface CanvasFactory {
  createCanvas: (width: number, height: number) => ExportCanvas;
}

export interface DownloadAdapter {
  download: (blob: Blob, filename: string) => void;
}

export interface PngSequenceExporterDependencies {
  readonly archiveSinkFactory?: (now: () => Date) => ArchiveSink;
  readonly canvasFactory?: CanvasFactory;
  readonly downloadAdapter?: DownloadAdapter;
  readonly createPlayback?: (sequence: MultiRigSequence) => MultiRigPlaybackController;
  readonly now?: () => Date;
  readonly yieldToBrowser?: () => Promise<void>;
}

export interface ExportController {
  readonly state: Reactive<PngSequenceExportState>;
  start: (options: PngSequenceExportOptions) => Promise<void>;
  cancel: () => void;
}

interface ExportManifest {
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationUnits: number;
  readonly durationSeconds: number;
  readonly frameCount: number;
  readonly generatedAt: string;
  readonly rigOrder: readonly RigId[];
  readonly sceneWorldRadius: number;
  readonly displayScale: number;
  readonly trailDecaySteps: number;
  readonly trailLoopMode: TrailLoopMode;
  readonly overlaySettings: VisualizerOverlaySettings;
  readonly sequenceSummary: string;
}

function createDomCanvasFactory(): CanvasFactory {
  return {
    createCanvas(width: number, height: number): ExportCanvas {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create export canvas context");
      }

      return {
        ctx,
        encodePng: () =>
          new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error("Unable to encode PNG frame"));
                return;
              }

              resolve(blob);
            }, "image/png");
          }),
        release: () => {
          canvas.width = 0;
          canvas.height = 0;
        }
      };
    }
  };
}

function createDownloadAdapter(): DownloadAdapter {
  return {
    download(blob: Blob, filename: string) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  };
}

function defaultYieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function padFrameIndex(index: number): string {
  return index.toString().padStart(5, "0");
}

function formatTimestampForFilename(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function normalizePositiveNumber(
  value: number | undefined,
  fallback: number,
  label: string
): number {
  const normalized = value ?? fallback;
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }

  return normalized;
}

function assertNotAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error("Export cancelled");
  }
}

function createManifest(options: {
  readonly exportOptions: Required<Pick<PngSequenceExportOptions, "width" | "height" | "fps">> &
    Omit<PngSequenceExportOptions, "width" | "height" | "fps">;
  readonly durationUnits: number;
  readonly frameCount: number;
  readonly generatedAt: Date;
}): ExportManifest {
  const { exportOptions, durationUnits, frameCount, generatedAt } = options;
  return {
    fps: exportOptions.fps,
    width: exportOptions.width,
    height: exportOptions.height,
    durationUnits,
    durationSeconds: frameCount / exportOptions.fps,
    frameCount,
    generatedAt: generatedAt.toISOString(),
    rigOrder: [...exportOptions.rigOrder],
    sceneWorldRadius: exportOptions.sceneWorldRadius,
    displayScale: exportOptions.displayScale,
    trailDecaySteps: exportOptions.trailDecaySteps,
    trailLoopMode: exportOptions.trailLoopMode ?? "auto",
    overlaySettings: cloneOverlaySettings(exportOptions.overlaySettings),
    sequenceSummary: exportOptions.sequenceSummary
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createPngSequenceExporter(
  dependencies: PngSequenceExporterDependencies = {}
): ExportController {
  const state = reactive<PngSequenceExportState>({
    status: "idle",
    framesWritten: 0,
    totalFrames: 0,
    errorMessage: null
  });
  const now = dependencies.now ?? (() => new Date());
  const archiveSinkFactory =
    dependencies.archiveSinkFactory ?? ((clock) => new TarArchiveSink({ now: clock }));
  const canvasFactory = dependencies.canvasFactory ?? createDomCanvasFactory();
  const downloadAdapter = dependencies.downloadAdapter ?? createDownloadAdapter();
  const createPlayback =
    dependencies.createPlayback ?? ((sequence) => useMultiRigPlayback(sequence));
  const yieldToBrowser = dependencies.yieldToBrowser ?? defaultYieldToBrowser;

  let activeAbortController: AbortController | null = null;

  const cancel = () => {
    activeAbortController?.abort(new Error("Export cancelled"));
  };

  const start = async (options: PngSequenceExportOptions) => {
    if (state.status === "running") {
      throw new Error("PNG sequence export is already running");
    }

    const width = normalizePositiveNumber(options.width, PNG_SEQUENCE_EXPORT_WIDTH, "Export width");
    const height = normalizePositiveNumber(
      options.height,
      PNG_SEQUENCE_EXPORT_HEIGHT,
      "Export height"
    );
    const fps = normalizePositiveNumber(options.fps, PNG_SEQUENCE_EXPORT_FPS, "Export FPS");
    const exportOptions = { ...options, width, height, fps };
    const generatedAt = now();
    const playback = createPlayback(options.sequence);
    const archive = archiveSinkFactory(now);
    const abortController = new AbortController();
    const canvas = canvasFactory.createCanvas(width, height);
    activeAbortController = abortController;

    state.status = "running";
    state.framesWritten = 0;
    state.totalFrames = 0;
    state.errorMessage = null;

    try {
      const prepared = playback.prepared.value;
      if (!prepared) {
        const errorCodes = playback.prepareErrors.value.map((error) => error.code).join(", ");
        throw new Error(
          errorCodes ? `Sequence validation failed: ${errorCodes}` : "Sequence is not prepared"
        );
      }

      const durationUnits = prepared.maxSequenceDuration;
      if (!Number.isFinite(durationUnits) || durationUnits <= 0) {
        throw new Error("Export duration must be positive");
      }

      const totalFrames = Math.ceil(durationUnits * fps);
      if (totalFrames <= 0) {
        throw new Error("Export produced no frames");
      }

      if (totalFrames > PNG_SEQUENCE_MAX_FRAME_COUNT) {
        throw new Error(
          `Export frame count exceeds the V1 limit of ${PNG_SEQUENCE_MAX_FRAME_COUNT}`
        );
      }

      state.totalFrames = totalFrames;

      const layout = createSceneLayout({
        cssWidth: width,
        cssHeight: height,
        dpr: 1,
        sceneRadiusWorld: options.sceneWorldRadius,
        pixelsPerWorldUnit: computeDisplayPixelsPerWorldUnit({
          cssWidth: width,
          cssHeight: height,
          sceneRadiusWorld: options.sceneWorldRadius,
          displayScale: options.displayScale
        })
      });

      if (canvas.ctx.canvas.width !== layout.canvasWidth)
        canvas.ctx.canvas.width = layout.canvasWidth;
      if (canvas.ctx.canvas.height !== layout.canvasHeight)
        canvas.ctx.canvas.height = layout.canvasHeight;
      canvas.ctx.setTransform(1, 0, 0, 1, 0, 0);

      const renderOptions: RenderFrameOptions = {
        transparentBackground: true,
        geometry: options.overlaySettings.geometry,
        showLabels: false,
        rigOrder: options.rigOrder,
        rigStyles: options.overlaySettings.rigStyles,
        showHandTrails: options.overlaySettings.visibility.showHandTrails,
        showHeadTrails: options.overlaySettings.visibility.showHeadTrails,
        showChainLines: options.overlaySettings.visibility.showChainLines,
        showNodeMarkers: options.overlaySettings.visibility.showNodeMarkers
      };

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        assertNotAborted(abortController.signal);

        const t = frameIndex / fps;
        if (t >= durationUnits) {
          break;
        }

        const evaluation = playback.evaluate(t);
        if (!evaluation.ok) {
          throw new Error(`Playback evaluation failed: ${evaluation.reason}`);
        }

        const trails = playback.sampleTrails(t, TRAIL_STEP_FIXED, options.trailDecaySteps, {
          loopMode: options.trailLoopMode ?? "auto",
          loopDuration: durationUnits
        });
        renderFrame(canvas.ctx, layout, evaluation.cartesianPoses, {
          ...renderOptions,
          trails
        });

        const blob = await canvas.encodePng();
        assertNotAborted(abortController.signal);
        await archive.writeFile(`frames/frame_${padFrameIndex(frameIndex)}.png`, blob);
        state.framesWritten = frameIndex + 1;
        await yieldToBrowser();
      }

      assertNotAborted(abortController.signal);
      const manifest = createManifest({
        exportOptions,
        durationUnits,
        frameCount: state.framesWritten,
        generatedAt
      });
      await archive.writeFile(
        "manifest.json",
        new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" })
      );
      const archiveBlob = await archive.finalize();
      downloadAdapter.download(
        archiveBlob,
        `poi-overlay-${formatTimestampForFilename(generatedAt)}-${width}x${height}-${fps}fps.tar`
      );
      state.status = "done";
    } catch (error) {
      archive.discard();
      if (abortController.signal.aborted) {
        state.status = "cancelled";
        state.errorMessage = null;
        return;
      }

      state.status = "error";
      state.errorMessage = getErrorMessage(error);
    } finally {
      canvas.release();
      playback.dispose();
      if (activeAbortController === abortController) {
        activeAbortController = null;
      }
    }
  };

  return {
    state,
    start,
    cancel
  };
}
