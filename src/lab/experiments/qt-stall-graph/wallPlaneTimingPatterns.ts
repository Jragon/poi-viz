import type { StallPatternOption } from "@/lab/experiments/qt-stall-graph/stallPatternOptions";

export const WALL_TIMING_OFFSETS = [
  { offset: "0/4", label: "Same" },
  { offset: "1/4", label: "R +¼" },
  { offset: "2/4", label: "Split" },
  { offset: "3/4", label: "L +¼" }
] as const;

export const WALL_PLANE_SAME_DIRECTION_PATTERNS: readonly StallPatternOption[] = [
  {
    codec: "q1.4.URDL.URDL",
    eyebrow: "0/4",
    label: "Same",
    ariaLabel: "Same direction, 0/4, Same"
  },
  {
    codec: "q1.4.LURD.URDL",
    eyebrow: "1/4",
    label: "R +¼",
    ariaLabel: "Same direction, 1/4, R plus one quarter"
  },
  {
    codec: "q1.4.DLUR.URDL",
    eyebrow: "2/4",
    label: "Split",
    ariaLabel: "Same direction, 2/4, Split"
  },
  {
    codec: "q1.4.RDLU.URDL",
    eyebrow: "3/4",
    label: "L +¼",
    ariaLabel: "Same direction, 3/4, L plus one quarter"
  }
];

export const WALL_PLANE_OPPOSITE_DIRECTION_PATTERNS: readonly StallPatternOption[] = [
  {
    codec: "q1.4.ULDR.URDL",
    eyebrow: "0/4",
    label: "Same",
    ariaLabel: "Opposite directions, 0/4, Same"
  },
  {
    codec: "q1.4.RULD.URDL",
    eyebrow: "1/4",
    label: "R +¼",
    ariaLabel: "Opposite directions, 1/4, R plus one quarter"
  },
  {
    codec: "q1.4.DRUL.URDL",
    eyebrow: "2/4",
    label: "Split",
    ariaLabel: "Opposite directions, 2/4, Split"
  },
  {
    codec: "q1.4.LDRU.URDL",
    eyebrow: "3/4",
    label: "L +¼",
    ariaLabel: "Opposite directions, 3/4, L plus one quarter"
  }
];

export const WALL_PLANE_TIMING_MATRIX = [
  {
    id: "same-direction",
    label: "Same direction",
    patterns: WALL_PLANE_SAME_DIRECTION_PATTERNS
  },
  {
    id: "opposite-directions",
    label: "Opposite directions",
    patterns: WALL_PLANE_OPPOSITE_DIRECTION_PATTERNS
  }
] as const;
