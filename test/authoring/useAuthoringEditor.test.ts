import { describe, expect, it } from "vitest";
import { computed, ref, type ComputedRef, type Ref } from "vue";

import { compileAuthoredDocument } from "@/authoring/compile";
import type {
    AuthoredDocumentEntry,
    AuthoredFirstSegment,
    AuthoredSequenceDocument
} from "@/authoring/types";
import {
    useAuthoringEditor,
    type CompileSuccess,
    type SelectedSegment
} from "@/authoring/useAuthoringEditor";
import { PI } from "@/engine/constants";

function makeFirstSegment(overrides: Partial<AuthoredFirstSegment> = {}): AuthoredFirstSegment {
  return {
    kind: "first",
    durationUnits: 1,
    hand: {
      startPose: { phaseDeg: 0, radius: 1 },
      driver: { kind: "circle", omega: 1, omegaUnit: "radians-per-unit" }
    },
    head: {
      startPose: { phaseDeg: 0, radius: 1 },
      driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
    },
    ...overrides
  };
}

function makeBaseDocument(): AuthoredSequenceDocument {
  return {
    name: "Doc",
    description: null,
    tracks: {
      left: {
        segments: [
          makeFirstSegment({
            hand: {
              startPose: { phaseDeg: 0, radius: 1 },
              driver: { kind: "circle", omega: 1, omegaUnit: "radians-per-unit" }
            },
            head: {
              startPose: { phaseDeg: 90, radius: 0.5 },
              driver: { kind: "circle", omega: 2, omegaUnit: "radians-per-unit" }
            }
          }),
          {
            kind: "continuation",
            durationUnits: 2,
            hand: { driver: { kind: "circle", omega: 3, omegaUnit: "radians-per-unit" } },
            head: { driver: { kind: "circle", omega: 4, omegaUnit: "radians-per-unit" } }
          },
          {
            kind: "continuation",
            durationUnits: 1,
            hand: { driver: { kind: "circle", omega: 5, omegaUnit: "radians-per-unit" } },
            head: { driver: { kind: "circle", omega: 6, omegaUnit: "radians-per-unit" } }
          }
        ]
      }
    }
  };
}

interface Harness {
  selectedEntry: ComputedRef<AuthoredDocumentEntry | null>;
  lastValidCompiled: Ref<CompileSuccess>;
  selectedSegment: Ref<SelectedSegment>;
  compileErrorMessage: Ref<string | null>;
  persisted: Array<{ id: string; document: AuthoredSequenceDocument }>;
  editor: ReturnType<typeof useAuthoringEditor>;
  currentDocument(): AuthoredSequenceDocument;
}

function createHarness(initial: AuthoredSequenceDocument): Harness {
  const compileInitial = compileAuthoredDocument(initial);
  if (!compileInitial.ok) {
    throw new Error("test fixture failed to compile");
  }

  const entryRef = ref<AuthoredDocumentEntry>({ id: "doc-1", document: initial });
  const selectedEntry = computed(() => entryRef.value);
  const lastValidCompiled = ref<CompileSuccess>(compileInitial);
  const selectedSegment = ref<SelectedSegment>(null);
  const compileErrorMessage = ref<string | null>(null);
  const persisted: Array<{ id: string; document: AuthoredSequenceDocument }> = [];

  const editor = useAuthoringEditor({
    selectedEntry,
    lastValidCompiled,
    selectedSegment,
    compileErrorMessage,
    persist: (id, document) => {
      persisted.push({ id, document });
      entryRef.value = { id, document };
    }
  });

  return {
    selectedEntry,
    lastValidCompiled,
    selectedSegment,
    compileErrorMessage,
    persisted,
    editor,
    currentDocument: () => entryRef.value.document
  };
}

describe("useAuthoringEditor", () => {
  describe("addSegment", () => {
    it("appends a continuation segment cloned from the last segment's drivers", () => {
      const harness = createHarness(makeBaseDocument());
      harness.editor.addSegment("left");

      const segments = harness.currentDocument().tracks.left!.segments;
      expect(segments).toHaveLength(4);
      const appended = segments[3];
      expect(appended.kind).toBe("continuation");
      expect(appended.durationUnits).toBe(1);
      expect(appended.hand.driver.omega).toBe(5);
      expect(appended.head.driver.omega).toBe(6);
      expect(harness.selectedSegment.value).toEqual({ trackId: "left", segmentIndex: 3 });
      expect(harness.persisted).toHaveLength(1);
    });

    it("creates a brand new track with one first segment when the side is absent", () => {
      const harness = createHarness(makeBaseDocument());
      harness.editor.addSegment("right");

      const rightTrack = harness.currentDocument().tracks.right;
      expect(rightTrack).toBeDefined();
      expect(rightTrack!.segments).toHaveLength(1);
      expect(rightTrack!.segments[0].kind).toBe("first");
      expect(harness.selectedSegment.value).toEqual({ trackId: "right", segmentIndex: 0 });
    });

    it("normalizes copied omega drivers to radians-per-unit", () => {
      const document = makeBaseDocument();
      const lastSegment = document.tracks.left!.segments[2];
      lastSegment.hand.driver.omega = 0.5;
      lastSegment.hand.driver.omegaUnit = "circles-per-unit";

      const harness = createHarness(document);
      harness.editor.addSegment("left");

      const appended = harness.currentDocument().tracks.left!.segments[3];
      expect(appended.hand.driver.omegaUnit).toBe("radians-per-unit");
      expect(appended.hand.driver.omega).toBeCloseTo(PI, 9);
    });

    it("appends to the tail even when a middle segment is selected", () => {
      const harness = createHarness(makeBaseDocument());
      harness.selectedSegment.value = { trackId: "left", segmentIndex: 1 };

      harness.editor.addSegment("left");

      const segments = harness.currentDocument().tracks.left!.segments;
      expect(segments).toHaveLength(4);
      expect(segments[3].kind).toBe("continuation");
      expect(harness.selectedSegment.value).toEqual({ trackId: "left", segmentIndex: 3 });
    });
  });

  describe("duplicateSegment", () => {
    it("inserts a continuation copy after the source segment and selects it", () => {
      const harness = createHarness(makeBaseDocument());
      harness.editor.duplicateSegment("left", 1);

      const segments = harness.currentDocument().tracks.left!.segments;
      expect(segments).toHaveLength(4);
      expect(segments[2].kind).toBe("continuation");
      expect(segments[2].durationUnits).toBe(2);
      expect(segments[2].hand.driver.omega).toBe(3);
      expect(harness.selectedSegment.value).toEqual({ trackId: "left", segmentIndex: 2 });
    });

    it("can duplicate the first segment as a continuation (no startPose copied)", () => {
      const harness = createHarness(makeBaseDocument());
      harness.editor.duplicateSegment("left", 0);

      const segments = harness.currentDocument().tracks.left!.segments;
      expect(segments[1].kind).toBe("continuation");
      expect((segments[1] as { hand: { driver: { omega: number } } }).hand.driver.omega).toBe(1);
      expect(harness.selectedSegment.value).toEqual({ trackId: "left", segmentIndex: 1 });
    });
  });

  describe("deleteSegment", () => {
    it("promotes segment 1 to a 'first' segment with the previously-derived start pose", () => {
      const harness = createHarness(makeBaseDocument());
      const promotedStartPose =
        harness.lastValidCompiled.value.boundariesByTrack.left![1].startPose;

      harness.editor.deleteSegment("left", 0);

      const segments = harness.currentDocument().tracks.left!.segments;
      expect(segments).toHaveLength(2);
      const promoted = segments[0];
      expect(promoted.kind).toBe("first");
      const promotedFirst = promoted as AuthoredFirstSegment;
      expect(promotedFirst.durationUnits).toBe(2);
      expect(promotedFirst.hand.driver.omega).toBe(3);
      expect(promotedFirst.head.driver.omega).toBe(4);
      expect(promotedFirst.hand.startPose.radius).toBeCloseTo(promotedStartPose.handPose.radius, 9);
      expect(promotedFirst.head.startPose.radius).toBeCloseTo(promotedStartPose.headPose.radius, 9);
    });

    it("removes a non-first segment without promoting", () => {
      const harness = createHarness(makeBaseDocument());
      harness.editor.deleteSegment("left", 1);

      const segments = harness.currentDocument().tracks.left!.segments;
      expect(segments).toHaveLength(2);
      expect(segments[0].kind).toBe("first");
      expect(segments[1].kind).toBe("continuation");
      expect((segments[1] as { hand: { driver: { omega: number } } }).hand.driver.omega).toBe(5);
    });

    it("refuses to delete the only remaining segment when only one track exists", () => {
      const document = makeBaseDocument();
      document.tracks.left!.segments = [document.tracks.left!.segments[0]];
      const harness = createHarness(document);

      harness.editor.deleteSegment("left", 0);

      expect(harness.persisted).toHaveLength(0);
      expect(harness.currentDocument().tracks.left!.segments).toHaveLength(1);
    });

    it("removes the entire track when its last segment is deleted and another track exists", () => {
      const document = makeBaseDocument();
      document.tracks.right = {
        segments: [
          makeFirstSegment({
            hand: {
              startPose: { phaseDeg: 0, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            },
            head: {
              startPose: { phaseDeg: 0, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            }
          })
        ]
      };
      const harness = createHarness(document);

      harness.editor.deleteSegment("right", 0);

      expect(harness.currentDocument().tracks.right).toBeUndefined();
      expect(harness.currentDocument().tracks.left).toBeDefined();
    });
  });

  describe("metadata updates", () => {
    it("commits a trimmed name and falls back to 'Untitled' when blank", () => {
      const harness = createHarness(makeBaseDocument());
      harness.editor.updateDocumentName("   ");
      expect(harness.currentDocument().name).toBe("Untitled");
    });

    it("normalizes empty/whitespace descriptions to null", () => {
      const document = makeBaseDocument();
      document.description = "old";
      const harness = createHarness(document);
      harness.editor.updateDocumentDescription("   ");
      expect(harness.currentDocument().description).toBeNull();
    });

    it("does not persist when name is unchanged", () => {
      const harness = createHarness(makeBaseDocument());
      harness.editor.updateDocumentName(harness.currentDocument().name);
      expect(harness.persisted).toHaveLength(0);
    });

    it("canonicalizes legacy circles-per-unit omega values when persisting", () => {
      const document = makeBaseDocument();
      document.tracks.left!.segments[0].hand.driver.omega = 1;
      document.tracks.left!.segments[0].hand.driver.omegaUnit = "circles-per-unit";
      const harness = createHarness(document);

      harness.editor.updateDocumentName("Renamed");

      const handDriver = harness.currentDocument().tracks.left!.segments[0].hand.driver;
      expect(handDriver.omegaUnit).toBe("radians-per-unit");
      expect(handDriver.omega).toBeCloseTo(2 * PI, 9);
    });
  });

  describe("commit semantics", () => {
    it("does not persist or update lastValidCompiled when the mutation produces an invalid document", () => {
      const harness = createHarness(makeBaseDocument());
      const compiledBefore = harness.lastValidCompiled.value;

      harness.editor.updateSegmentDuration("left", 0, Number.NaN);

      expect(harness.persisted).toHaveLength(0);
      expect(harness.lastValidCompiled.value).toBe(compiledBefore);
    });
  });
});
