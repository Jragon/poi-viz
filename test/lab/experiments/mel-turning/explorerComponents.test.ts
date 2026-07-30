import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";

import type { TurningReelConfig } from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import LowReelEndpointCard from "@/lab/experiments/mel-turning/components/LowReelEndpointCard.vue";
import LowReelRouteStepsTable from "@/lab/experiments/mel-turning/components/LowReelRouteStepsTable.vue";
import TurningResearchArticle from "@/lab/experiments/mel-turning/components/TurningResearchArticle.vue";
import { buildLowReelRouteProjection } from "@/lab/experiments/mel-turning/model/lowReelRouteProjection";
import { solveLowReelTurningRoutes } from "@/lab/experiments/mel-turning/model/lowReelRouteSolver";

describe("Mel turning explorer components", () => {
  it("exposes every low-reel position and the exact Mel-derived summary", async () => {
    const config: TurningReelConfig = {
      left: "low-native",
      right: "low-native",
      direction: { mode: "same", direction: "clockwise" },
      offset: 0
    };
    const fixture = defineComponent(
      () => () => h(LowReelEndpointCard, { modelValue: config, title: "Source graph" })
    );
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toContain("Source graph");
    expect(html).toContain("Low native");
    expect(html).toContain("Low non-native");
    expect(html).toContain("Low back");
    expect(html).toContain("SS");
    expect(html).toContain("mill");
    expect(html).toContain("Left CW · Right CW");
    expect(html).toContain("0 half-beats · Unison");
  });

  it("makes derived target direction and timing-compatible offsets explicit", async () => {
    const config: TurningReelConfig = {
      left: "low-native",
      right: "low-non-native",
      direction: { mode: "same", direction: "counterclockwise" },
      offset: 1
    };
    const fixture = defineComponent(
      () => () =>
        h(LowReelEndpointCard, {
          modelValue: config,
          title: "Target graph",
          directionLocked: true,
          allowedOffsets: [1, 3],
          constraintMessage:
            "Same · CCW is fixed by the source. Offsets 1 and 3 preserve SS timing.",
          adjustmentMessage: "Offset 0 changed to 1 to preserve SS timing."
        })
    );
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toContain("Derived from source");
    expect(html).toContain("Same · CCW is fixed by the source.");
    expect(html).toContain("Offset 0 changed to 1");
    expect(html).toContain('aria-disabled="true"');
  });

  it("keeps established rules and unresolved physical claims separate in the article", async () => {
    const fixture = defineComponent(() => () => h(TurningResearchArticle));
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toContain("Observer and performer frames");
    expect(html).toContain("C/Lb/Rb");
    expect(html).toContain("Known from current evidence");
    expect(html).toContain("Still unresolved or physical");
    expect(html).toContain("finite path");
  });

  it("renders the complete solver route as a compact selectable steps table", async () => {
    const result = solveLowReelTurningRoutes({
      source: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 0
      },
      turnDirection: "left"
    });
    const route = result.routes[0];
    if (!route) throw new Error("Expected a solver route for the table fixture.");
    const projection = buildLowReelRouteProjection(result, route);
    const fixture = defineComponent(
      () => () =>
        h(LowReelRouteStepsTable, {
          steps: projection.steps,
          activeStep: 4
        })
    );
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toContain("Source cycle · shortest bridge · target cycle");
    expect(html).toContain("Outgoing interval");
    expect(html).toContain("Body turn");
    expect(html).toContain("Circle extension");
    expect(html).toContain(">Turn<");
    expect(html).toContain(">Recovery<");
    expect(html).toContain("unresolved");
    expect(html).toContain("bg-sky-950/35");
  });
});
