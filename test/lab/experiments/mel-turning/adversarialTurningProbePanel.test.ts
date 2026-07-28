import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";

import AdversarialTurningProbePanel from "@/lab/experiments/mel-turning/components/AdversarialTurningProbePanel.vue";
import { evaluateAdversarialTurningProbes } from "@/lab/experiments/mel-turning/fixtures/adversarialTurningProbes";

describe("AdversarialTurningProbePanel", () => {
  it("shows rejected and unresolved mutations as different outcomes", async () => {
    const results = evaluateAdversarialTurningProbes();
    const fixture = defineComponent(() => () =>
      h(AdversarialTurningProbePanel, { results })
    );
    const html = await renderToString(createSSRApp(fixture));

    expect(html.match(/data-adversarial-probe=/g)).toHaveLength(7);
    expect(html).toContain("Rejected structurally");
    expect(html).toContain("Survives · unresolved");
    expect(html).toContain("TURN_PHASE_DISCONTINUITY");
  });
});
