import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";

import MelTurningGraph from "@/lab/experiments/mel-turning/components/MelTurningGraph.vue";
import { getVerifiedTurningTrace } from "@/lab/experiments/mel-turning/fixtures/verifiedTurningTraces";

describe("MelTurningGraph", () => {
  it("renders five vertical lanes, outside phase annotations, and one shared turn band", async () => {
    const trace = getVerifiedTurningTrace("ts-left-chasing-1-to-2");
    const fixture = defineComponent(
      () => () => h(MelTurningGraph, { trace, frame: "body-relative" })
    );
    const html = await renderToString(createSSRApp(fixture));

    for (const label of ["Left high", "Left low", "Center", "Right low", "Right high"]) {
      expect(html).toContain(label);
    }

    expect(html.match(/data-turn-band/g)).toHaveLength(1);
    expect(html.match(/data-trace-region/g)).toHaveLength(2);
    expect(html).toContain("SOURCE");
    expect(html).toContain("TARGET");
    expect(html).toContain("TURN LEFT");
    expect(html).not.toContain("TURN LEFT · 180°");
    expect(html).toContain("0°");
    expect(html).toContain("180°");
    expect(html.match(/data-phase-chevron/g)).toHaveLength(26);
    expect(html.match(/data-plane-side/g)).toHaveLength(26);
  });

  it("keeps coincident hand nodes on the exact same lane coordinate", async () => {
    const trace = getVerifiedTurningTrace("ts-left-chasing-1-to-2");
    const fixture = defineComponent(
      () => () => h(MelTurningGraph, { trace, frame: "body-relative" })
    );
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toMatch(/data-turning-node="left-0"[\s\S]*?<circle cx="276" cy="58"/);
    expect(html).toMatch(/data-turning-node="right-0"[\s\S]*?<circle cx="276" cy="58"/);
  });

  it("mirrors post-turn body lanes in the observer-relative frame", async () => {
    const trace = getVerifiedTurningTrace("ts-left-chasing-1-to-2");
    const fixture = defineComponent(
      () => () => h(MelTurningGraph, { trace, frame: "observer-relative" })
    );
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toMatch(
      /data-turning-node="left-9" data-source-lane="left-low" data-display-lane="right-low"[\s\S]*?<circle cx="368" cy="454"/
    );
    expect(html).toContain('data-display-frame="observer-relative"');
  });

  it("marks the active row and behind-body nodes without changing anatomical hand color", async () => {
    const base = getVerifiedTurningTrace("ts-left-chasing-1-to-2");
    const trace = {
      ...base,
      tracks: base.tracks.map((track) => ({
        ...track,
        nodes: track.nodes.map((node, index) => ({
          ...node,
          ...(index === 0 ? { handPlacement: "behind-body" as const } : {})
        }))
      }))
    };
    const fixture = defineComponent(
      () => () => h(MelTurningGraph, { trace, frame: "observer-relative", activeStep: 9 })
    );
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toContain('data-hand-placement="behind-body"');
    expect(html).toContain('stroke-width="4"');
    expect(html).toContain("#fb7185");
  });
});
