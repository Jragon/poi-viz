import type { AuthoredSequenceDocument } from "@/authoring/types";
import type { MultiRigSequence } from "@/engine/types";
import type { StallPatternDraft } from "@/lab/experiments/qt-stall-graph/stallPattern";
import type { PoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/types";

export type PatternKind = "authoring" | "stall-graph" | "beat-graph";

export type PatternSource =
  | { readonly kind: "authoring"; readonly document: AuthoredSequenceDocument }
  | { readonly kind: "stall-graph"; readonly draft: StallPatternDraft }
  | { readonly kind: "beat-graph"; readonly graph: PoiBeatGraph };

export interface PatternFolder {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
}

export interface PatternEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly folderId: string | null;
  readonly source: PatternSource;
}

export interface PatternRegistrySnapshot {
  readonly version: 2;
  readonly selectedPatternId: string | null;
  readonly folders: readonly PatternFolder[];
  readonly patterns: readonly PatternEntry[];
}

export type PatternValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export type PatternCompileResult =
  | {
      readonly ok: true;
      readonly sequence: MultiRigSequence;
      readonly diagnostics: readonly string[];
    }
  | { readonly ok: false; readonly message: string };
