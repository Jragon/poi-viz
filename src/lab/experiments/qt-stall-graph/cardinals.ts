import type { PlaneId, Vec3 } from "@/engine/types";

// ─── Cardinal types ──────────────────────────────────────────────────────────

export type Cardinal = "U" | "R" | "D" | "L" | "F" | "B";

/** Display column order (user preference: F U R D L B). */
export const CARDINAL_ORDER: readonly Cardinal[] = ["F", "U", "R", "D", "L", "B"];

export const CARDINAL_LABELS: Record<Cardinal, string> = {
  U: "Up",
  R: "Right",
  D: "Down",
  L: "Left",
  F: "Forward",
  B: "Back"
};

export const CARDINAL_WORLD_VECTORS: Record<Cardinal, Vec3> = {
  R: { x: 1, y: 0, z: 0 },
  L: { x: -1, y: 0, z: 0 },
  U: { x: 0, y: 1, z: 0 },
  D: { x: 0, y: -1, z: 0 },
  F: { x: 0, y: 0, z: 1 },
  B: { x: 0, y: 0, z: -1 }
};

export type CardinalRelation = "same" | "opposite" | "perpendicular";

export function classifyCardinalRelation(left: Cardinal, right: Cardinal): CardinalRelation {
  const a = CARDINAL_WORLD_VECTORS[left];
  const b = CARDINAL_WORLD_VECTORS[right];
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  if (dot === 1) return "same";
  if (dot === -1) return "opposite";
  return "perpendicular";
}

// ─── Plane circle definitions ────────────────────────────────────────────────
//
// Each plane is a circle of 4 cardinals in order (CW when viewed from the
// canonical observer direction).  Angles are in degrees, measured in local 2D
// for that plane:
//   Wall:  right is 0°, up is 90°, etc. (standard math convention)
//   Wheel: forward is 0°, up is 90°, back is 180°, down is 270°
//   Floor: right is 0°, forward is 90°, left is 180°, back is 270°

const WALL_ANGLES: Partial<Record<Cardinal, number>> = { R: 0, U: 90, L: 180, D: 270 };
const WHEEL_ANGLES: Partial<Record<Cardinal, number>> = { F: 0, U: 90, B: 180, D: 270 };
const FLOOR_ANGLES: Partial<Record<Cardinal, number>> = { R: 0, F: 90, L: 180, B: 270 };

const PLANE_ANGLES: Record<PlaneId, Partial<Record<Cardinal, number>>> = {
  wall: WALL_ANGLES,
  wheel: WHEEL_ANGLES,
  floor: FLOOR_ANGLES
};

// ─── Edge resolution ─────────────────────────────────────────────────────────

/**
 * The arc id encodes the start and end degrees within the resolved plane.
 * e.g. "0-90" means the hand sweeps from 0° to 90° locally.
 * In a looping directed stall-graph a chained edge always uses the forward
 * direction (the compiler emits one forward segment per edge; there is no
 * back-and-forth here).
 */
export interface ResolvedEdge {
  readonly planeId: PlaneId;
  /** Start angle in degrees within the plane's local 2D. */
  readonly fromDeg: number;
  /** End angle in degrees within the plane's local 2D. */
  readonly toDeg: number;
}

// Opposite pairs are illegal (they would be a 180° arc, not a quarter).
const OPPOSITE_PAIRS = new Set<string>(["U-D", "D-U", "L-R", "R-L", "F-B", "B-F"]);

/**
 * Resolve a directed cardinal edge to its unique plane and local angles.
 * Returns null for self-loops and opposite-cardinal pairs (illegal transitions).
 *
 * This is the core 12-edge bijection: every non-opposite distinct cardinal pair
 * maps unambiguously to exactly one plane.
 */
export function resolveEdge(from: Cardinal, to: Cardinal): ResolvedEdge | null {
  if (from === to) return null;
  if (OPPOSITE_PAIRS.has(`${from}-${to}`)) return null;

  for (const [planeId, angles] of Object.entries(PLANE_ANGLES) as [
    PlaneId,
    Partial<Record<Cardinal, number>>
  ][]) {
    const fromDeg = angles[from];
    const toDeg = angles[to];
    if (fromDeg !== undefined && toDeg !== undefined) {
      return { planeId, fromDeg, toDeg };
    }
  }

  // Exhausted all planes — the pair is not on any shared plane.
  return null;
}

/** Returns true when a directed cardinal transition is a legal stall-graph edge. */
export function isLegalEdge(from: Cardinal, to: Cardinal): boolean {
  return resolveEdge(from, to) !== null;
}
