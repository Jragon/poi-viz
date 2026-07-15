import type { Cardinal } from "@/lab/experiments/qt-stall-graph/cardinals";

export const STALL_PATTERN_VERSION = 1 as const;

export type StallPatternHand = "left" | "right";
export type StallPatternStep = Cardinal | null;
export type StallPatternTrackDraft = readonly StallPatternStep[];
export type StallPatternTrack = readonly Cardinal[];

export interface StallPatternDraft {
  readonly version: typeof STALL_PATTERN_VERSION;
  readonly beatCount: number;
  readonly tracks: {
    readonly left: StallPatternTrackDraft | null;
    readonly right: StallPatternTrackDraft | null;
  };
}

export interface StallPattern {
  readonly version: typeof STALL_PATTERN_VERSION;
  readonly beatCount: number;
  readonly tracks: {
    readonly left: StallPatternTrack | null;
    readonly right: StallPatternTrack | null;
  };
}

export type StallPatternValidationCode =
  | "NOT_OBJECT"
  | "UNSUPPORTED_VERSION"
  | "INVALID_BEAT_COUNT"
  | "INVALID_TRACKS"
  | "INVALID_TRACK"
  | "TRACK_LENGTH_MISMATCH"
  | "INVALID_STEP"
  | "NO_TRACKS";

export interface StallPatternValidationIssue {
  readonly code: StallPatternValidationCode;
  readonly path: string;
  readonly message: string;
}

export type StallPatternDraftValidationResult =
  | { readonly ok: true; readonly draft: StallPatternDraft }
  | { readonly ok: false; readonly issues: readonly StallPatternValidationIssue[] };

export type CompleteStallPatternResult =
  | { readonly ok: true; readonly pattern: StallPattern }
  | { readonly ok: false; readonly issues: readonly StallPatternValidationIssue[] };

const CARDINALS = new Set<Cardinal>(["F", "U", "R", "D", "L", "B"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCardinal(value: unknown): value is Cardinal {
  return typeof value === "string" && CARDINALS.has(value as Cardinal);
}

function validateTrack(
  value: unknown,
  hand: StallPatternHand,
  beatCount: number | null,
  issues: StallPatternValidationIssue[]
): StallPatternTrackDraft | null {
  const path = `tracks.${hand}`;
  if (value === null) return null;

  if (!Array.isArray(value)) {
    issues.push({
      code: "INVALID_TRACK",
      path,
      message: `${path} must be an array or null`
    });
    return null;
  }

  if (beatCount !== null && value.length !== beatCount) {
    issues.push({
      code: "TRACK_LENGTH_MISMATCH",
      path,
      message: `${path} must contain exactly ${beatCount} beats`
    });
  }

  const track: StallPatternStep[] = [];
  value.forEach((step, index) => {
    if (step === null || isCardinal(step)) {
      track.push(step);
      return;
    }

    issues.push({
      code: "INVALID_STEP",
      path: `${path}.${index}`,
      message: `${path}.${index} must be a cardinal or null`
    });
  });

  return track;
}

export function validateStallPatternDraft(value: unknown): StallPatternDraftValidationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ code: "NOT_OBJECT", path: "", message: "Stall pattern draft must be an object" }]
    };
  }

  const issues: StallPatternValidationIssue[] = [];
  if (value.version !== STALL_PATTERN_VERSION) {
    issues.push({
      code: "UNSUPPORTED_VERSION",
      path: "version",
      message: `Stall pattern version must be ${STALL_PATTERN_VERSION}`
    });
  }

  const beatCount =
    Number.isSafeInteger(value.beatCount) && (value.beatCount as number) >= 2
      ? (value.beatCount as number)
      : null;
  if (beatCount === null) {
    issues.push({
      code: "INVALID_BEAT_COUNT",
      path: "beatCount",
      message: "Stall pattern beatCount must be a safe integer greater than or equal to 2"
    });
  }

  if (!isRecord(value.tracks)) {
    issues.push({
      code: "INVALID_TRACKS",
      path: "tracks",
      message: "Stall pattern tracks must be an object"
    });
    return { ok: false, issues };
  }

  const left = validateTrack(value.tracks.left, "left", beatCount, issues);
  const right = validateTrack(value.tracks.right, "right", beatCount, issues);
  if (value.tracks.left === null && value.tracks.right === null) {
    issues.push({
      code: "NO_TRACKS",
      path: "tracks",
      message: "Stall pattern must include at least one hand"
    });
  }

  if (issues.length > 0 || beatCount === null) return { ok: false, issues };

  return {
    ok: true,
    draft: {
      version: STALL_PATTERN_VERSION,
      beatCount,
      tracks: { left, right }
    }
  };
}

export function createEmptyStallPatternDraft(beatCount = 4): StallPatternDraft {
  const result = validateStallPatternDraft({
    version: STALL_PATTERN_VERSION,
    beatCount,
    tracks: {
      left: Array.from({ length: beatCount }, () => null),
      right: Array.from({ length: beatCount }, () => null)
    }
  });

  if (!result.ok) {
    throw new Error(result.issues.map((issue) => issue.message).join("; "));
  }

  return result.draft;
}

export function completeStallPattern(draft: StallPatternDraft): CompleteStallPatternResult {
  const validated = validateStallPatternDraft(draft);
  if (!validated.ok) return validated;

  const issues: StallPatternValidationIssue[] = [];
  const completeTrack = (
    hand: StallPatternHand,
    track: StallPatternTrackDraft | null
  ): StallPatternTrack | null => {
    if (track === null) return null;

    track.forEach((step, index) => {
      if (step !== null) return;
      issues.push({
        code: "INVALID_STEP",
        path: `tracks.${hand}.${index}`,
        message: `tracks.${hand}.${index} must be filled before the pattern is complete`
      });
    });

    return track.filter((step): step is Cardinal => step !== null);
  };

  const left = completeTrack("left", validated.draft.tracks.left);
  const right = completeTrack("right", validated.draft.tracks.right);
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    pattern: {
      version: STALL_PATTERN_VERSION,
      beatCount: validated.draft.beatCount,
      tracks: { left, right }
    }
  };
}
