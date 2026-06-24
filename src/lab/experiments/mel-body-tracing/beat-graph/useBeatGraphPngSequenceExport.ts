import { nextTick, reactive, type Reactive } from "vue";

import type { TimeUnit } from "@/engine/types";
import type { PoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { TarArchiveSink, type ArchiveSink } from "@/visualizer/exportTar";

const DEFAULT_GRAPH_EXPORT_SCALE = 4;

export type BeatGraphPngSequenceExportStatus = "idle" | "running" | "done" | "error";

export interface BeatGraphPngSequenceExportState {
  status: BeatGraphPngSequenceExportStatus;
  framesWritten: number;
  totalFrames: number;
  errorMessage: string | null;
}

export interface BeatGraphPngSequenceExportOptions {
  readonly graph: PoiBeatGraph;
  readonly halfBeatDuration: TimeUnit;
  readonly scale?: number;
}

export interface BeatGraphPngSequenceExporterDependencies {
  readonly getRootElement: () => HTMLElement | null;
  readonly setActiveStepOverride: (step: number | null) => void;
  readonly archiveSinkFactory?: (now: () => Date) => ArchiveSink;
  readonly download?: (blob: Blob, filename: string) => void;
  readonly now?: () => Date;
}

export interface BeatGraphPngSequenceExporter {
  readonly state: Reactive<BeatGraphPngSequenceExportState>;
  exportGraph: (options: BeatGraphPngSequenceExportOptions) => Promise<void>;
}

interface SvgRasterSize {
  readonly width: number;
  readonly height: number;
}

interface BeatGraphPngSequenceManifest {
  readonly halfBeatDuration: TimeUnit;
  readonly cycleSteps: number;
  readonly cycleDurationSeconds: number;
  readonly imageCount: number;
  readonly images: readonly BeatGraphPngSequenceManifestImage[];
  readonly width: number;
  readonly height: number;
  readonly generatedAt: string;
}

interface BeatGraphPngSequenceManifestImage {
  readonly step: number;
  readonly filename: string;
  readonly holdSeconds: number;
  readonly startsAtSeconds: number;
}

const textEncoder = new TextEncoder();

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

function padFrameIndex(index: number): string {
  return index.toString().padStart(2, "0");
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

function createDownloadAdapter() {
  return (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function findGraphSvg(rootElement: HTMLElement): SVGSVGElement {
  const svg = rootElement.querySelector("svg");
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("Beat graph SVG was not found");
  }

  return svg;
}

function getSvgRasterSize(svg: SVGSVGElement, scale: number): SvgRasterSize {
  const viewBox = svg.viewBox.baseVal;
  const sourceWidth = viewBox.width || svg.getBoundingClientRect().width;
  const sourceHeight = viewBox.height || svg.getBoundingClientRect().height;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Beat graph SVG has no exportable size");
  }

  return {
    width: Math.ceil(sourceWidth * scale),
    height: Math.ceil(sourceHeight * scale)
  };
}

function stripEditorOnlyElements(svg: SVGSVGElement): void {
  svg.querySelectorAll("foreignObject").forEach((element) => element.remove());
}

function inlineSvgStyles(source: Element, target: Element): void {
  const computedStyle = window.getComputedStyle(source);
  const style = Array.from(computedStyle)
    .map((property) => `${property}:${computedStyle.getPropertyValue(property)};`)
    .join("");

  target.setAttribute("style", style);

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((sourceChild, index) => {
    const targetChild = targetChildren[index];
    if (targetChild) inlineSvgStyles(sourceChild, targetChild);
  });
}

function serializeSvgFrame(sourceSvg: SVGSVGElement, size: SvgRasterSize): string {
  const svg = sourceSvg.cloneNode(true) as SVGSVGElement;
  inlineSvgStyles(sourceSvg, svg);
  stripEditorOnlyElements(svg);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(size.width));
  svg.setAttribute("height", String(size.height));

  return new XMLSerializer().serializeToString(svg);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to rasterize beat graph SVG"));
    image.src = url;
  });
}

function encodeCanvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to encode beat graph PNG frame"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

async function rasterizeSvgToPng(svgMarkup: string, size: SvgRasterSize): Promise<Blob> {
  const svgBlob = new Blob([textEncoder.encode(svgMarkup)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create beat graph export canvas");
    }

    ctx.clearRect(0, 0, size.width, size.height);
    ctx.drawImage(image, 0, 0, size.width, size.height);
    return await encodeCanvasPng(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function createManifest(options: {
  readonly graph: PoiBeatGraph;
  readonly halfBeatDuration: TimeUnit;
  readonly size: SvgRasterSize;
  readonly generatedAt: Date;
}): BeatGraphPngSequenceManifest {
  const cycleDurationSeconds = options.graph.cycleSteps * options.halfBeatDuration;

  return {
    halfBeatDuration: options.halfBeatDuration,
    cycleSteps: options.graph.cycleSteps,
    cycleDurationSeconds,
    imageCount: options.graph.cycleSteps,
    images: Array.from({ length: options.graph.cycleSteps }, (_, step) => ({
      step,
      filename: `frames/step_${padFrameIndex(step + 1)}.png`,
      holdSeconds: options.halfBeatDuration,
      startsAtSeconds: step * options.halfBeatDuration
    })),
    width: options.size.width,
    height: options.size.height,
    generatedAt: options.generatedAt.toISOString()
  };
}

export function useBeatGraphPngSequenceExport(
  dependencies: BeatGraphPngSequenceExporterDependencies
): BeatGraphPngSequenceExporter {
  const state = reactive<BeatGraphPngSequenceExportState>({
    status: "idle",
    framesWritten: 0,
    totalFrames: 0,
    errorMessage: null
  });
  const now = dependencies.now ?? (() => new Date());
  const archiveSinkFactory =
    dependencies.archiveSinkFactory ?? ((clock) => new TarArchiveSink({ now: clock }));
  const download = dependencies.download ?? createDownloadAdapter();

  const exportGraph = async (options: BeatGraphPngSequenceExportOptions) => {
    if (state.status === "running") {
      throw new Error("Beat graph PNG sequence export is already running");
    }

    const scale = normalizePositiveNumber(
      options.scale,
      DEFAULT_GRAPH_EXPORT_SCALE,
      "Export scale"
    );
    const cycleDuration = options.graph.cycleSteps * options.halfBeatDuration;

    if (!Number.isFinite(cycleDuration) || cycleDuration <= 0) {
      throw new Error("Beat graph cycle duration must be positive");
    }

    const totalFrames = Math.floor(options.graph.cycleSteps);

    const rootElement = dependencies.getRootElement();
    if (!rootElement) {
      throw new Error("Beat graph export root is not mounted");
    }

    const generatedAt = now();
    const archive = archiveSinkFactory(now);
    const filename = `beat-graph-png-sequence-${formatTimestampForFilename(generatedAt)}.tar`;

    state.status = "running";
    state.framesWritten = 0;
    state.totalFrames = totalFrames;
    state.errorMessage = null;

    try {
      for (let step = 0; step < totalFrames; step += 1) {
        dependencies.setActiveStepOverride(step);
        await nextTick();

        const svg = findGraphSvg(rootElement);
        const size = getSvgRasterSize(svg, scale);
        const svgMarkup = serializeSvgFrame(svg, size);
        const png = await rasterizeSvgToPng(svgMarkup, size);
        await archive.writeFile(`frames/step_${padFrameIndex(step + 1)}.png`, png);
        state.framesWritten = step + 1;
      }

      const svg = findGraphSvg(rootElement);
      const size = getSvgRasterSize(svg, scale);
      const manifest = createManifest({
        graph: options.graph,
        halfBeatDuration: options.halfBeatDuration,
        size,
        generatedAt
      });
      await archive.writeFile(
        "manifest.json",
        textEncoder.encode(JSON.stringify(manifest, null, 2))
      );

      const tar = await archive.finalize();
      download(tar, filename);
      state.status = "done";
    } catch (error) {
      archive.discard();
      state.status = "error";
      state.errorMessage = getErrorMessage(error);
      throw error;
    } finally {
      dependencies.setActiveStepOverride(null);
      await nextTick();
    }
  };

  return { state, exportGraph };
}
