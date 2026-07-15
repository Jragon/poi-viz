import type { Cardinal } from "@/lab/experiments/qt-stall-graph/cardinals";
import {
  STALL_PATTERN_VERSION,
  type StallPatternDraft,
  type StallPatternTrackDraft,
  type StallPatternValidationIssue,
  validateStallPatternDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";

export const STALL_PATTERN_CODEC_PREFIX = `q${STALL_PATTERN_VERSION}`;

export type StallPatternCodecErrorCode =
  | "INVALID_FORMAT"
  | "UNSUPPORTED_VERSION"
  | "INVALID_BEAT_COUNT"
  | "INVALID_TRACK_LENGTH"
  | "INVALID_TRACK_TOKEN"
  | "NO_TRACKS"
  | "INVALID_PATTERN";

export interface StallPatternCodecError {
  readonly code: StallPatternCodecErrorCode;
  readonly message: string;
  readonly issues?: readonly StallPatternValidationIssue[];
}

export type DecodeStallPatternResult =
  | { readonly ok: true; readonly draft: StallPatternDraft }
  | { readonly ok: false; readonly error: StallPatternCodecError };

export type EncodeStallPatternResult =
  | { readonly ok: true; readonly codec: string }
  | { readonly ok: false; readonly error: StallPatternCodecError };

type DecodeTrackResult =
  | { readonly ok: true; readonly track: StallPatternTrackDraft | null }
  | { readonly ok: false; readonly error: StallPatternCodecError };

const CARDINAL_TOKENS = new Set<Cardinal>(["F", "U", "R", "D", "L", "B"]);

function decodeTrack(
  payload: string,
  hand: "left" | "right",
  beatCount: number
): DecodeTrackResult {
  if (payload === "-") return { ok: true, track: null };

  if (payload.length !== beatCount) {
    return {
      ok: false,
      error: {
        code: "INVALID_TRACK_LENGTH",
        message: `${hand} track must contain exactly ${beatCount} beat tokens`
      }
    };
  }

  const track = Array.from(payload).map((token, index) => {
    if (token === "_") return null;
    if (CARDINAL_TOKENS.has(token as Cardinal)) return token as Cardinal;
    return { token, index };
  });
  const invalid = track.find(
    (step): step is { readonly token: string; readonly index: number } =>
      typeof step === "object" && step !== null
  );
  if (invalid) {
    return {
      ok: false,
      error: {
        code: "INVALID_TRACK_TOKEN",
        message: `${hand} track contains invalid token ${JSON.stringify(invalid.token)} at beat ${invalid.index + 1}`
      }
    };
  }

  return { ok: true, track: track as StallPatternTrackDraft };
}

export function decodeStallPattern(codec: string): DecodeStallPatternResult {
  const [prefix, beatCountPayload, leftPayload, rightPayload, ...extra] = codec.split(".");
  if (
    extra.length > 0 ||
    prefix === undefined ||
    beatCountPayload === undefined ||
    leftPayload === undefined ||
    rightPayload === undefined
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_FORMAT",
        message: "Stall pattern codec must use q1.<beats>.<left>.<right>"
      }
    };
  }

  if (prefix !== STALL_PATTERN_CODEC_PREFIX) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_VERSION",
        message: `Stall pattern codec version must be ${STALL_PATTERN_CODEC_PREFIX}`
      }
    };
  }

  if (!/^[0-9]+$/.test(beatCountPayload)) {
    return {
      ok: false,
      error: { code: "INVALID_BEAT_COUNT", message: "Codec beat count must be an integer" }
    };
  }

  const beatCount = Number(beatCountPayload);
  if (!Number.isSafeInteger(beatCount) || beatCount < 2) {
    return {
      ok: false,
      error: {
        code: "INVALID_BEAT_COUNT",
        message: "Codec beat count must be a safe integer greater than or equal to 2"
      }
    };
  }

  const left = decodeTrack(leftPayload, "left", beatCount);
  if (!left.ok) return left;
  const right = decodeTrack(rightPayload, "right", beatCount);
  if (!right.ok) return right;
  if (left.track === null && right.track === null) {
    return {
      ok: false,
      error: { code: "NO_TRACKS", message: "Stall pattern codec must include at least one hand" }
    };
  }

  const validated = validateStallPatternDraft({
    version: STALL_PATTERN_VERSION,
    beatCount,
    tracks: { left: left.track, right: right.track }
  });
  if (!validated.ok) {
    return {
      ok: false,
      error: {
        code: "INVALID_PATTERN",
        message: "Decoded stall pattern is invalid",
        issues: validated.issues
      }
    };
  }

  return { ok: true, draft: validated.draft };
}

function encodeTrack(track: StallPatternTrackDraft | null): string {
  if (track === null) return "-";
  return track.map((step) => step ?? "_").join("");
}

export function encodeStallPattern(draft: StallPatternDraft): EncodeStallPatternResult {
  const validated = validateStallPatternDraft(draft);
  if (!validated.ok) {
    return {
      ok: false,
      error: {
        code: "INVALID_PATTERN",
        message: "Cannot encode an invalid stall pattern",
        issues: validated.issues
      }
    };
  }

  return {
    ok: true,
    codec: [
      STALL_PATTERN_CODEC_PREFIX,
      validated.draft.beatCount,
      encodeTrack(validated.draft.tracks.left),
      encodeTrack(validated.draft.tracks.right)
    ].join(".")
  };
}
