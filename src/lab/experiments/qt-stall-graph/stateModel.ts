import type { Cardinal } from "@/lab/experiments/qt-stall-graph/cardinals";
import { CARDINAL_ORDER } from "@/lab/experiments/qt-stall-graph/cardinals";

// ─── State model ──────────────────────────────────────────────────────────────

export type StallGraphHand = "left" | "right";

export interface StallGraphNode {
  readonly cardinal: Cardinal;
}

/**
 * Sparse per-hand node map: beat index -> node.
 * Only contains beats where that hand has a node.
 */
export type StallGraphNodeMap = Map<number, StallGraphNode>;

export interface StallGraphEditState {
  // Sparse node maps per hand
  readonly left: StallGraphNodeMap;
  readonly right: StallGraphNodeMap;

  // Editing
  readonly editMode: StallGraphHand;
  readonly selectedNodeKey: string | null; // format: "{hand}-{beatIndex}"

  // Visibility
  readonly showLeft: boolean;
  readonly showRight: boolean;

  // Compilation
  readonly playLeft: boolean;
  readonly playRight: boolean;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export const STALL_GRAPH_LAYOUT = {
  leftPad: 50,
  rightPad: 28,
  topPad: 34,
  bottomPad: 30,
  laneGap: 58,
  rowGap: 38,
  nodeRadius: 7,
  nodeRadiusActive: 10
} as const;

// ─── Computed geometry ────────────────────────────────────────────────────────

export function xForLaneIndex(index: number): number {
  return STALL_GRAPH_LAYOUT.leftPad + index * STALL_GRAPH_LAYOUT.laneGap;
}

export function yForBeatIndex(index: number): number {
  return STALL_GRAPH_LAYOUT.topPad + index * STALL_GRAPH_LAYOUT.rowGap;
}

export function svgDimensions(beatCount: number): { width: number; height: number } {
  return {
    width:
      STALL_GRAPH_LAYOUT.leftPad +
      STALL_GRAPH_LAYOUT.rightPad +
      STALL_GRAPH_LAYOUT.laneGap * Math.max(CARDINAL_ORDER.length - 1, 0),
    height:
      STALL_GRAPH_LAYOUT.topPad +
      STALL_GRAPH_LAYOUT.bottomPad +
      STALL_GRAPH_LAYOUT.rowGap * Math.max(beatCount, 0)
  };
}

// ─── Node accessors ───────────────────────────────────────────────────────────

export function getNode(nodes: StallGraphNodeMap, beatIndex: number): StallGraphNode | undefined {
  return nodes.get(beatIndex);
}

export function setNode(
  nodes: StallGraphNodeMap,
  beatIndex: number,
  cardinal: Cardinal
): StallGraphNodeMap {
  const updated = new Map(nodes);
  updated.set(beatIndex, { cardinal });
  return updated;
}

export function clearNode(nodes: StallGraphNodeMap, beatIndex: number): StallGraphNodeMap {
  const updated = new Map(nodes);
  updated.delete(beatIndex);
  return updated;
}

export function getNodeOnBeat(
  nodes: StallGraphNodeMap,
  beatIndex: number
): StallGraphNode | undefined {
  return nodes.get(beatIndex);
}

/**
 * Returns the beat index and node for the first (oldest/lowest) node,
 * or undefined if the map is empty.
 */
export function getFirstBeat(nodes: StallGraphNodeMap): number | undefined {
  if (nodes.size === 0) return undefined;
  return Math.min(...nodes.keys());
}

/**
 * Returns the beat index of the last (newest/highest) node,
 * or undefined if the map is empty.
 */
export function getLastBeat(nodes: StallGraphNodeMap): number | undefined {
  if (nodes.size === 0) return undefined;
  return Math.max(...nodes.keys());
}

/**
 * Returns the number of beats in the graph (max beat index + 1),
 * or 0 if both hands are empty.
 */
export function getBeatCount(state: Pick<StallGraphEditState, "left" | "right">): number {
  const lastLeft = getLastBeat(state.left);
  const lastRight = getLastBeat(state.right);
  if (lastLeft === undefined && lastRight === undefined) return 0;
  return Math.max(lastLeft ?? -1, lastRight ?? -1) + 1;
}

/**
 * Returns consecutive nodes as an ordered array for a single hand,
 * suitable for compilation after row-completeness validation.
 * Used for validation: checks if the hand has at least 2 marks to form a cycle.
 */
export function getConsecutiveMarks(
  nodes: StallGraphNodeMap
): { marks: Cardinal[]; beats: number[] } | null {
  if (nodes.size < 2) return null;
  const sorted = Array.from(nodes.entries()).sort((a, b) => a[0] - b[0]);
  return {
    marks: sorted.map(([, node]) => node.cardinal),
    beats: sorted.map(([beat]) => beat)
  };
}
