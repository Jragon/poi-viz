import type { PlaneId } from "@/engine/types";
import {
  CARDINAL_ORDER,
  resolveEdge,
  type Cardinal
} from "@/lab/experiments/qt-stall-graph/cardinals";
import type {
  StallPatternDraft,
  StallPatternHand,
  StallPatternTrackDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";

export type StallGraphOrientation = "horizontal" | "vertical";
export type StallGraphDensity = "thumbnail" | "compact" | "editor";

export interface StallGraphBeatRange {
  readonly start: number;
  readonly count: number;
}

export interface StallGraphGeometryOptions {
  readonly orientation: StallGraphOrientation;
  readonly density: StallGraphDensity;
  readonly beatRange?: StallGraphBeatRange;
  readonly showTerminal?: boolean;
  readonly activeBeat?: number | null;
}

export interface StallGraphLayout {
  readonly topPad: number;
  readonly rightPad: number;
  readonly bottomPad: number;
  readonly leftPad: number;
  readonly cardinalGap: number;
  readonly beatGap: number;
  readonly nodeRadius: number;
  readonly sharedNodeRadius: number;
  readonly strokeWidth: number;
  readonly labelFontSize: number;
}

export interface StallGraphPointView {
  readonly key: string;
  readonly hand: StallPatternHand;
  readonly beatIndex: number;
  readonly displayBeatIndex: number;
  readonly cardinal: Cardinal;
  readonly x: number;
  readonly y: number;
  readonly isTerminal: boolean;
  readonly isShared: boolean;
}

export interface StallGraphConnectorView {
  readonly key: string;
  readonly hand: StallPatternHand;
  readonly fromBeatIndex: number;
  readonly toBeatIndex: number;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly isLegal: boolean;
  readonly planeId: PlaneId | null;
}

export interface StallGraphClickTargetView {
  readonly key: string;
  readonly beatIndex: number;
  readonly cardinal: Cardinal;
  readonly x: number;
  readonly y: number;
}

export interface StallGraphLineView {
  readonly key: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface StallGraphLabelView {
  readonly key: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly dominantBaseline: "auto" | "middle";
  readonly isTerminal: boolean;
}

export interface StallGraphGeometry {
  readonly width: number;
  readonly height: number;
  readonly layout: StallGraphLayout;
  readonly orientation: StallGraphOrientation;
  readonly cardinalLines: readonly StallGraphLineView[];
  readonly beatLines: readonly StallGraphLineView[];
  readonly cardinalLabels: readonly StallGraphLabelView[];
  readonly beatLabels: readonly StallGraphLabelView[];
  readonly points: readonly StallGraphPointView[];
  readonly connectors: readonly StallGraphConnectorView[];
  readonly clickTargets: readonly StallGraphClickTargetView[];
  readonly activeLine: StallGraphLineView | null;
}

export const STALL_GRAPH_LAYOUTS: Record<StallGraphDensity, StallGraphLayout> = {
  thumbnail: {
    topPad: 18,
    rightPad: 10,
    bottomPad: 10,
    leftPad: 24,
    cardinalGap: 18,
    beatGap: 22,
    nodeRadius: 3.5,
    sharedNodeRadius: 2,
    strokeWidth: 1.5,
    labelFontSize: 7
  },
  compact: {
    topPad: 24,
    rightPad: 14,
    bottomPad: 14,
    leftPad: 32,
    cardinalGap: 26,
    beatGap: 32,
    nodeRadius: 5,
    sharedNodeRadius: 3,
    strokeWidth: 2,
    labelFontSize: 9
  },
  editor: {
    topPad: 30,
    rightPad: 20,
    bottomPad: 18,
    leftPad: 42,
    cardinalGap: 38,
    beatGap: 44,
    nodeRadius: 7,
    sharedNodeRadius: 4,
    strokeWidth: 2.5,
    labelFontSize: 10
  }
};

interface DisplayBeat {
  readonly globalIndex: number;
  readonly displayIndex: number;
  readonly isTerminal: boolean;
}

function assertBeatRange(draft: StallPatternDraft, range: StallGraphBeatRange): void {
  if (!Number.isInteger(range.start) || range.start < 0 || range.start >= draft.beatCount) {
    throw new Error("Stall graph beat range start is outside the pattern");
  }
  if (
    !Number.isInteger(range.count) ||
    range.count < 1 ||
    range.start + range.count > draft.beatCount
  ) {
    throw new Error("Stall graph beat range count is outside the pattern");
  }
}

function makeDisplayBeats(
  draft: StallPatternDraft,
  range: StallGraphBeatRange,
  showTerminal: boolean
): readonly DisplayBeat[] {
  const beats = Array.from({ length: range.count }, (_, displayIndex) => ({
    globalIndex: range.start + displayIndex,
    displayIndex,
    isTerminal: false
  }));

  if (!showTerminal) return beats;
  return [
    ...beats,
    {
      globalIndex: (range.start + range.count) % draft.beatCount,
      displayIndex: range.count,
      isTerminal: true
    }
  ];
}

function coordinate(
  orientation: StallGraphOrientation,
  layout: StallGraphLayout,
  displayBeatIndex: number,
  cardinalIndex: number
): { readonly x: number; readonly y: number } {
  if (orientation === "horizontal") {
    return {
      x: layout.leftPad + displayBeatIndex * layout.beatGap,
      y: layout.topPad + cardinalIndex * layout.cardinalGap
    };
  }

  return {
    x: layout.leftPad + cardinalIndex * layout.cardinalGap,
    y: layout.topPad + displayBeatIndex * layout.beatGap
  };
}

function trackStep(track: StallPatternTrackDraft | null, beatIndex: number): Cardinal | null {
  return track?.[beatIndex] ?? null;
}

function makePoints(
  draft: StallPatternDraft,
  orientation: StallGraphOrientation,
  layout: StallGraphLayout,
  displayBeats: readonly DisplayBeat[]
): readonly StallGraphPointView[] {
  return (["left", "right"] as const).flatMap((hand) => {
    const track = draft.tracks[hand];
    if (track === null) return [];

    const otherTrack = draft.tracks[hand === "left" ? "right" : "left"];
    return displayBeats.flatMap((beat) => {
      const cardinal = trackStep(track, beat.globalIndex);
      if (cardinal === null) return [];
      const cardinalIndex = CARDINAL_ORDER.indexOf(cardinal);
      const position = coordinate(orientation, layout, beat.displayIndex, cardinalIndex);
      return [
        {
          key: `${hand}-${beat.displayIndex}-${beat.globalIndex}${beat.isTerminal ? "-terminal" : ""}`,
          hand,
          beatIndex: beat.globalIndex,
          displayBeatIndex: beat.displayIndex,
          cardinal,
          ...position,
          isTerminal: beat.isTerminal,
          isShared: trackStep(otherTrack, beat.globalIndex) === cardinal
        }
      ];
    });
  });
}

function makeConnectors(
  draft: StallPatternDraft,
  orientation: StallGraphOrientation,
  layout: StallGraphLayout,
  displayBeats: readonly DisplayBeat[]
): readonly StallGraphConnectorView[] {
  return (["left", "right"] as const).flatMap((hand) => {
    const track = draft.tracks[hand];
    if (track === null) return [];

    const connectors: StallGraphConnectorView[] = [];
    for (let index = 0; index < displayBeats.length - 1; index++) {
      const fromBeat = displayBeats[index];
      const toBeat = displayBeats[index + 1];
      const from = trackStep(track, fromBeat.globalIndex);
      const to = trackStep(track, toBeat.globalIndex);
      if (from === null || to === null) continue;

      const start = coordinate(
        orientation,
        layout,
        fromBeat.displayIndex,
        CARDINAL_ORDER.indexOf(from)
      );
      const end = coordinate(orientation, layout, toBeat.displayIndex, CARDINAL_ORDER.indexOf(to));
      const edge = resolveEdge(from, to);
      connectors.push({
        key: `${hand}-${fromBeat.displayIndex}-${toBeat.displayIndex}`,
        hand,
        fromBeatIndex: fromBeat.globalIndex,
        toBeatIndex: toBeat.globalIndex,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        isLegal: edge !== null,
        planeId: edge?.planeId ?? null
      });
    }
    return connectors;
  });
}

function makeClickTargets(
  orientation: StallGraphOrientation,
  layout: StallGraphLayout,
  displayBeats: readonly DisplayBeat[]
): readonly StallGraphClickTargetView[] {
  return displayBeats.flatMap((beat) => {
    if (beat.isTerminal) return [];
    return CARDINAL_ORDER.map((cardinal, cardinalIndex) => ({
      key: `target-${beat.globalIndex}-${cardinal}`,
      beatIndex: beat.globalIndex,
      cardinal,
      ...coordinate(orientation, layout, beat.displayIndex, cardinalIndex)
    }));
  });
}

function makeActiveLine(
  activeBeat: number | null,
  displayBeats: readonly DisplayBeat[],
  orientation: StallGraphOrientation,
  layout: StallGraphLayout,
  width: number,
  height: number
): StallGraphLineView | null {
  if (activeBeat === null) return null;
  const active = displayBeats.find((beat) => !beat.isTerminal && beat.globalIndex === activeBeat);
  if (!active) return null;

  if (orientation === "horizontal") {
    const x = layout.leftPad + active.displayIndex * layout.beatGap;
    return { key: "active", x1: x, y1: layout.topPad, x2: x, y2: height - layout.bottomPad };
  }

  const y = layout.topPad + active.displayIndex * layout.beatGap;
  return { key: "active", x1: layout.leftPad, y1: y, x2: width - layout.rightPad, y2: y };
}

export function buildStallGraphGeometry(
  draft: StallPatternDraft,
  options: StallGraphGeometryOptions
): StallGraphGeometry {
  const layout = STALL_GRAPH_LAYOUTS[options.density];
  const range = options.beatRange ?? { start: 0, count: draft.beatCount };
  assertBeatRange(draft, range);
  const displayBeats = makeDisplayBeats(draft, range, options.showTerminal ?? true);
  const beatSpan = Math.max(displayBeats.length - 1, 0) * layout.beatGap;
  const cardinalSpan = Math.max(CARDINAL_ORDER.length - 1, 0) * layout.cardinalGap;
  const width =
    layout.leftPad +
    layout.rightPad +
    (options.orientation === "horizontal" ? beatSpan : cardinalSpan);
  const height =
    layout.topPad +
    layout.bottomPad +
    (options.orientation === "horizontal" ? cardinalSpan : beatSpan);

  const cardinalLines = CARDINAL_ORDER.map((cardinal, cardinalIndex) => {
    const start = coordinate(options.orientation, layout, 0, cardinalIndex);
    const end = coordinate(options.orientation, layout, displayBeats.length - 1, cardinalIndex);
    return {
      key: `cardinal-${cardinal}`,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y
    };
  });
  const beatLines = displayBeats.map((beat) => {
    const start = coordinate(options.orientation, layout, beat.displayIndex, 0);
    const end = coordinate(
      options.orientation,
      layout,
      beat.displayIndex,
      CARDINAL_ORDER.length - 1
    );
    return {
      key: `beat-${beat.displayIndex}`,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y
    };
  });
  const cardinalLabels = CARDINAL_ORDER.map((cardinal, cardinalIndex) => {
    const position = coordinate(options.orientation, layout, 0, cardinalIndex);
    const textAnchor: StallGraphLabelView["textAnchor"] =
      options.orientation === "horizontal" ? "end" : "middle";
    const dominantBaseline: StallGraphLabelView["dominantBaseline"] =
      options.orientation === "horizontal" ? "middle" : "auto";
    return {
      key: `cardinal-label-${cardinal}`,
      text: cardinal,
      x: options.orientation === "horizontal" ? layout.leftPad - 8 : position.x,
      y: options.orientation === "horizontal" ? position.y : layout.topPad - 10,
      textAnchor,
      dominantBaseline,
      isTerminal: false
    };
  });
  const isFullRange = range.start === 0 && range.count === draft.beatCount;
  const beatLabels = displayBeats.map((beat) => {
    const position = coordinate(options.orientation, layout, beat.displayIndex, 0);
    const terminalText = isFullRange ? "loop" : `→${beat.globalIndex + 1}`;
    const textAnchor: StallGraphLabelView["textAnchor"] =
      options.orientation === "horizontal" ? "middle" : "end";
    const dominantBaseline: StallGraphLabelView["dominantBaseline"] =
      options.orientation === "horizontal" ? "auto" : "middle";
    return {
      key: `beat-label-${beat.displayIndex}`,
      text: beat.isTerminal ? terminalText : String(beat.globalIndex + 1),
      x: options.orientation === "horizontal" ? position.x : layout.leftPad - 8,
      y: options.orientation === "horizontal" ? layout.topPad - 10 : position.y,
      textAnchor,
      dominantBaseline,
      isTerminal: beat.isTerminal
    };
  });

  return {
    width,
    height,
    layout,
    orientation: options.orientation,
    cardinalLines,
    beatLines,
    cardinalLabels,
    beatLabels,
    points: makePoints(draft, options.orientation, layout, displayBeats),
    connectors: makeConnectors(draft, options.orientation, layout, displayBeats),
    clickTargets: makeClickTargets(options.orientation, layout, displayBeats),
    activeLine: makeActiveLine(
      options.activeBeat ?? null,
      displayBeats,
      options.orientation,
      layout,
      width,
      height
    )
  };
}
