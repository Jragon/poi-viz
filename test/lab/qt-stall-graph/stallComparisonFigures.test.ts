import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, type Component } from "vue";

import StallOffsetCycleFigure from "@/lab/experiments/qt-stall-graph/StallOffsetCycleFigure.vue";
import TimingDirectionMatrixFigure from "@/lab/experiments/qt-stall-graph/TimingDirectionMatrixFigure.vue";

vi.mock("@/lab/components/EmbeddedVisualizer.vue", () => ({
  default: {
    props: ["title", "summary"],
    template: '<section aria-label="embedded-preview">{{ title }} {{ summary }}</section>'
  }
}));

async function render(component: Component): Promise<string> {
  const app = createSSRApp(defineComponent(() => () => h(component)));
  app.component("RouterLink", {
    template: "<a><slot /></a>"
  });
  return renderToString(app);
}

describe("stall comparison figures", () => {
  it("renders the four static offsets and explicit wraparound", async () => {
    const html = await render(StallOffsetCycleFigure);

    expect(html.match(/Pattern thumbnail/g)).toHaveLength(4);
    expect(html).toContain("Same");
    expect(html).toContain("R +¼");
    expect(html).toContain("Split");
    expect(html).toContain("L +¼");
    expect(html).toContain("0/4 → 1/4 → 2/4 → 3/4 → 0/4");
    expect(html).not.toContain('aria-pressed="');
    expect(html).not.toContain("<figure");
  });

  it("renders an accessible selectable two-by-four matrix", async () => {
    const html = await render(TimingDirectionMatrixFigure);

    expect(html).toContain("Same direction");
    expect(html).toContain("Opposite directions");
    expect(html.match(/Pattern thumbnail/g)).toHaveLength(8);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(7);
    expect(html).toContain("Select pattern: Same direction, 1/4, R plus one quarter");
    expect(html).toContain("Select pattern: Opposite directions, 3/4, L plus one quarter");
    expect(html).toContain("Selected timing and direction");
    expect(html.toLowerCase()).not.toContain("leader");
    expect(html.toLowerCase()).not.toContain("follower");
    expect(html).not.toContain("<figure");
  });
});
