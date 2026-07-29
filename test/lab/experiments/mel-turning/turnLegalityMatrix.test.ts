import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";

import TurnLegalityMatrix from "@/lab/experiments/mel-turning/components/TurnLegalityMatrix.vue";
import { VERIFIED_ONE_HAND_TURNS } from "@/lab/experiments/mel-turning/fixtures/verifiedOneHandTurns";
import { VERIFIED_TWO_HAND_TURNS } from "@/lab/experiments/mel-turning/fixtures/verifiedTwoHandTurns";
import { buildTurnLegalityMatrix } from "@/lab/experiments/mel-turning/model/turnLegalityMatrix";

describe("TurnLegalityMatrix", () => {
  it("renders all normalized evidence without flattening one-hand or back notation", async () => {
    const rows = buildTurnLegalityMatrix([
      ...VERIFIED_ONE_HAND_TURNS,
      ...VERIFIED_TWO_HAND_TURNS
    ]);
    const fixture = defineComponent(() => () => h(TurnLegalityMatrix, { rows }));
    const html = await renderToString(createSSRApp(fixture));

    expect(html.match(/data-legality-row=/g)).toHaveLength(50);
    expect(html).toContain("ONE · low-native");
    expect(html).toContain("Cb B");
    expect(html).toContain("Verified legality matrix · 50 turns");
  });
});
