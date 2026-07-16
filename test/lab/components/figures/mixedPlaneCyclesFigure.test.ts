import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";

import MixedPlaneCyclesFigure from "@/lab/components/figures/MixedPlaneCyclesFigure.vue";
import {
  classifyCardinalRelation,
  resolveEdge,
  type Cardinal
} from "@/lab/experiments/qt-stall-graph/cardinals";
import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";

vi.mock("@/lab/components/EmbeddedVisualizer.vue", () => ({
  default: {
    props: ["title", "summary"],
    template: '<section aria-label="embedded-preview">{{ title }} {{ summary }}</section>'
  }
}));

async function render(): Promise<string> {
  return renderToString(createSSRApp(defineComponent(() => () => h(MixedPlaneCyclesFigure))));
}

function completeTracks(codec: string): { left: Cardinal[]; right: Cardinal[] } {
  const decoded = decodeStallPattern(codec);
  if (!decoded.ok || decoded.draft.tracks.left === null || decoded.draft.tracks.right === null) {
    throw new Error(`Invalid fixture ${codec}`);
  }
  return {
    left: decoded.draft.tracks.left as Cardinal[],
    right: decoded.draft.tracks.right as Cardinal[]
  };
}

describe("mixed-plane cycles figure", () => {
  it("renders two route panels, a plane key, and one shared preview", async () => {
    const html = await render();

    expect(html.match(/class="lab-figure-panel"/g)).toHaveLength(2);
    expect(html).toContain("q1.4.URDF.URDF");
    expect(html).toContain("q1.4.FULD.URDF");
    expect(html).toContain("Wall");
    expect(html).toContain("Wheel");
    expect(html).toContain("Floor");
    expect(html.match(/aria-label="embedded-preview"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('data-plane="wall"');
    expect(html).toContain('data-plane="wheel"');
    expect(html).not.toContain("<figure");
  });

  it("keeps every FULD/URDF checkpoint perpendicular", () => {
    const { left, right } = completeTracks("q1.4.FULD.URDF");
    expect(left.map((cardinal, index) => classifyCardinalRelation(cardinal, right[index]))).toEqual(
      ["perpendicular", "perpendicular", "perpendicular", "perpendicular"]
    );
  });

  it("resolves the documented outgoing plane sequences", () => {
    const { left, right } = completeTracks("q1.4.FULD.URDF");
    const planes = (track: Cardinal[]) =>
      track.map(
        (cardinal, index) => resolveEdge(cardinal, track[(index + 1) % track.length])?.planeId
      );

    expect(planes(left)).toEqual(["wheel", "wall", "wall", "wheel"]);
    expect(planes(right)).toEqual(["wall", "wall", "wheel", "wheel"]);
  });
});
