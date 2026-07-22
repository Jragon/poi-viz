<script setup lang="ts">
import { computed, ref } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import LabFigureGrid from "@/lab/components/figures/LabFigureGrid.vue";
import LabFigurePanel from "@/lab/components/figures/LabFigurePanel.vue";
import PatternPlaneLegend from "@/lab/components/figures/PatternPlaneLegend.vue";
import {
  classifyCardinalRelation,
  resolveEdge,
  type Cardinal,
  type CardinalRelation
} from "@/lab/experiments/qt-stall-graph/cardinals";
import { compileStallPattern } from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import StallPatternGraph from "@/lab/experiments/qt-stall-graph/StallPatternGraph.vue";
import { LAB_PLANE_LABELS } from "@/lab/planePresentation";

interface MixedPlanePanel {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly codec: string;
}

interface CheckpointSummary {
  readonly index: number;
  readonly left: Cardinal;
  readonly right: Cardinal;
  readonly relation: CardinalRelation;
  readonly relationLabel: string;
  readonly leftPlane: string;
  readonly rightPlane: string;
}

const panels: readonly MixedPlanePanel[] = [
  {
    id: "shared-route",
    label: "A",
    title: "One shared non-planar route",
    codec: "q1.4.URDF.URDF"
  },
  {
    id: "different-routes",
    label: "B",
    title: "Different routes · Infinite L checkpoints",
    codec: "q1.4.FULD.URDF"
  }
];

function decodeComplete(codec: string) {
  const decoded = decodeStallPattern(codec);
  if (!decoded.ok) throw new Error(`Mixed-plane figure codec is invalid: ${codec}`);
  const left = decoded.draft.tracks.left;
  const right = decoded.draft.tracks.right;
  if (
    left === null ||
    right === null ||
    left.some((mark) => mark === null) ||
    right.some((mark) => mark === null)
  ) {
    throw new Error(`Mixed-plane figure codec must contain two complete tracks: ${codec}`);
  }
  const compiled = compileStallPattern(decoded.draft);
  if (!compiled.sequence || compiled.diagnostics.length > 0) {
    throw new Error(`Mixed-plane figure codec does not compile: ${codec}`);
  }
  return {
    draft: decoded.draft,
    left: left as readonly Cardinal[],
    right: right as readonly Cardinal[],
    sequence: compiled.sequence
  };
}

const resolvedPanels = panels.map((panel) => {
  const resolved = decodeComplete(panel.codec);
  const checkpoints: readonly CheckpointSummary[] = resolved.left.map((left, index) => {
    const right = resolved.right[index];
    const nextLeft = resolved.left[(index + 1) % resolved.left.length];
    const nextRight = resolved.right[(index + 1) % resolved.right.length];
    const relation = classifyCardinalRelation(left, right);
    return {
      index,
      left,
      right,
      relation,
      relationLabel:
        relation === "same" ? "Same" : relation === "opposite" ? "Split" : "Infinite L",
      leftPlane: LAB_PLANE_LABELS[resolveEdge(left, nextLeft)?.planeId ?? "wall"],
      rightPlane: LAB_PLANE_LABELS[resolveEdge(right, nextRight)?.planeId ?? "wall"]
    };
  });
  return { ...panel, ...resolved, checkpoints };
});

const selectedId = ref(resolvedPanels[0].id);
const selected = computed(
  () => resolvedPanels.find((panel) => panel.id === selectedId.value) ?? resolvedPanels[0]
);
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <PatternPlaneLegend />
    <LabFigureGrid layout="two-up">
      <LabFigurePanel
        v-for="panel in resolvedPanels"
        :key="panel.id"
        :label="panel.label"
        :title="panel.title"
      >
        <button
          type="button"
          class="grid min-w-0 gap-3 rounded-md border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-amber-300"
          :class="
            panel.id === selectedId
              ? 'border-amber-400/60 bg-slate-950/80'
              : 'border-ui-border-subtle bg-slate-950/50 hover:border-slate-600'
          "
          :aria-pressed="panel.id === selectedId"
          :aria-label="`Preview ${panel.title}`"
          @click="selectedId = panel.id"
        >
          <code class="text-[10px] text-ui-text-muted">{{ panel.codec }}</code>
          <StallPatternGraph
            :draft="panel.draft"
            density="thumbnail"
            orientation="horizontal"
            connector-color="plane"
            :fill-container="true"
            :aria-label="`${panel.title}. Plane-colored connectors; left track solid, right track dashed.`"
          />
          <ol class="grid grid-cols-2 gap-1 text-[10px] text-slate-400 sm:grid-cols-4">
            <li
              v-for="checkpoint in panel.checkpoints"
              :key="checkpoint.index"
              class="rounded border border-ui-border-subtle/80 px-1.5 py-1"
            >
              <span class="block font-mono text-slate-300">
                {{ checkpoint.index + 1 }} · {{ checkpoint.left }}/{{ checkpoint.right }}
              </span>
              <span class="block">{{ checkpoint.relationLabel }}</span>
              <span class="block text-[10px] text-ui-text-muted">
                L {{ checkpoint.leftPlane }} · R {{ checkpoint.rightPlane }}
              </span>
            </li>
          </ol>
        </button>
      </LabFigurePanel>
    </LabFigureGrid>

    <EmbeddedVisualizer
      :sequence="selected.sequence"
      :title="selected.title"
      :summary="selected.codec"
      size="compact"
      :autoplay="false"
      :show-body-rig="true"
      projection-mode="auto"
    />
  </div>
</template>
