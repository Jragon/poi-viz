import type { Cardinal } from "@/lab/experiments/qt-stall-graph/cardinals";
import type {
  StallPatternDraft,
  StallPatternHand,
  StallPatternTrackDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";

function normalizeIndex(index: number, beatCount: number): number {
  return ((index % beatCount) + beatCount) % beatCount;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
}

function updateTrack(
  draft: StallPatternDraft,
  hand: StallPatternHand,
  track: StallPatternTrackDraft | null
): StallPatternDraft {
  return {
    ...draft,
    tracks: {
      ...draft.tracks,
      [hand]: track
    }
  };
}

export function setStallPatternNode(
  draft: StallPatternDraft,
  hand: StallPatternHand,
  beatIndex: number,
  cardinal: Cardinal | null
): StallPatternDraft {
  assertInteger(beatIndex, "Stall pattern beat index");
  if (beatIndex < 0 || beatIndex >= draft.beatCount) {
    throw new Error("Stall pattern beat index is outside the pattern");
  }

  const track = draft.tracks[hand];
  if (track === null) throw new Error(`Cannot edit absent ${hand} stall pattern track`);
  const nextTrack = [...track];
  nextTrack[beatIndex] = cardinal;
  return updateTrack(draft, hand, nextTrack);
}

export function setStallPatternTrackPresent(
  draft: StallPatternDraft,
  hand: StallPatternHand,
  present: boolean
): StallPatternDraft {
  if (!present) return updateTrack(draft, hand, null);
  if (draft.tracks[hand] !== null) return draft;
  return updateTrack(
    draft,
    hand,
    Array.from({ length: draft.beatCount }, () => null)
  );
}

export function appendStallPatternBeat(draft: StallPatternDraft): StallPatternDraft {
  const append = (track: StallPatternTrackDraft | null): StallPatternTrackDraft | null =>
    track === null ? null : [...track, null];
  return {
    ...draft,
    beatCount: draft.beatCount + 1,
    tracks: {
      left: append(draft.tracks.left),
      right: append(draft.tracks.right)
    }
  };
}

export function deleteLastStallPatternBeat(draft: StallPatternDraft): StallPatternDraft {
  if (draft.beatCount <= 2) return draft;
  const trim = (track: StallPatternTrackDraft | null): StallPatternTrackDraft | null =>
    track === null ? null : track.slice(0, -1);
  return {
    ...draft,
    beatCount: draft.beatCount - 1,
    tracks: {
      left: trim(draft.tracks.left),
      right: trim(draft.tracks.right)
    }
  };
}

export function shiftStallPatternTrack(
  draft: StallPatternDraft,
  hand: StallPatternHand,
  deltaBeats: number
): StallPatternDraft {
  assertInteger(deltaBeats, "Stall pattern track offset");
  const track = draft.tracks[hand];
  if (track === null || deltaBeats === 0) return draft;

  const shifted: (Cardinal | null)[] = Array.from({ length: draft.beatCount }, () => null);
  track.forEach((step, index) => {
    shifted[normalizeIndex(index + deltaBeats, draft.beatCount)] = step;
  });
  return updateTrack(draft, hand, shifted);
}

export function rotateStallPatternCycleStart(
  draft: StallPatternDraft,
  deltaBeats: number
): StallPatternDraft {
  assertInteger(deltaBeats, "Stall pattern cycle-start offset");
  if (deltaBeats === 0) return draft;

  const rotate = (track: StallPatternTrackDraft | null): StallPatternTrackDraft | null => {
    if (track === null) return null;
    return Array.from(
      { length: draft.beatCount },
      (_, index) => track[normalizeIndex(index + deltaBeats, draft.beatCount)] ?? null
    );
  };
  return {
    ...draft,
    tracks: {
      left: rotate(draft.tracks.left),
      right: rotate(draft.tracks.right)
    }
  };
}
