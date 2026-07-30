import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";

import type { TurningReelConfig } from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import LowReelEndpointCard from "@/lab/experiments/mel-turning/components/LowReelEndpointCard.vue";
import TurningResearchArticle from "@/lab/experiments/mel-turning/components/TurningResearchArticle.vue";

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

  it("keeps established rules and unresolved physical claims separate in the article", async () => {
    const fixture = defineComponent(() => () => h(TurningResearchArticle));
    const html = await renderToString(createSSRApp(fixture));

    expect(html).toContain("Observer and performer frames");
    expect(html).toContain("C/Lb/Rb");
    expect(html).toContain("Known from current evidence");
    expect(html).toContain("Still unresolved or physical");
    expect(html).toContain("finite path");
  });
});
