import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, type Component } from "vue";

import DownbeatTimeline from "@/lab/components/figures/timing/DownbeatTimeline.vue";
import FamiliarTimingFigure from "@/lab/components/figures/timing/FamiliarTimingFigure.vue";
import HandedQuarterTimingFigure from "@/lab/components/figures/timing/HandedQuarterTimingFigure.vue";
import OffsetWavesFigure from "@/lab/components/figures/timing/OffsetWavesFigure.vue";
import PhaseWaveDiagram from "@/lab/components/figures/timing/PhaseWaveDiagram.vue";
import PoiOrbitDiagram from "@/lab/components/figures/timing/PoiOrbitDiagram.vue";

async function render(component: Component): Promise<string> {
  return renderToString(createSSRApp(component));
}

function fixture(component: Component, props: Record<string, unknown> = {}) {
  return defineComponent({
    setup() {
      return () => h(component, props);
    }
  });
}

describe("timing diagram primitives", () => {
  it("renders an accessible shared orbit with clear direction and downbeat markers", async () => {
    const html = await render(
      fixture(PoiOrbitDiagram, {
        downbeatOffset: 0.25,
        leftDirection: "positive",
        rightDirection: "negative",
        time: 0
      })
    );

    expect(html).toContain('role="img"');
    expect(html).toContain("Wall-plane circular timing snapshot");
    expect(html).toContain("share one circular orbit");
    expect(html).toContain("Only the conventional bottom downbeat is marked");
    expect(html).toContain("downbeat");
    expect(html).toContain(">U</text>");
    expect(html).toContain(">D</text>");
    expect(html).toContain("poi-orbit-diagram__down-marker");
    expect(html).not.toContain(">bottom</text>");
    expect(html).not.toContain('r="34"');
    expect(html).toContain("L ↺");
    expect(html).toContain("R ↻");
  });

  it("shows both hands when they coincide on the shared orbit", async () => {
    const html = await render(fixture(PoiOrbitDiagram));

    expect(html).toContain("poi-orbit-diagram__combined-marker");
    expect(html).toContain("fill-cyan-300");
    expect(html).toContain("fill-pink-300");
  });

  it("describes continuous orbit times without an undefined label", async () => {
    const html = await render(fixture(PoiOrbitDiagram, { time: 0.1 }));

    expect(html).toContain("cycle time 0.10");
    expect(html).not.toContain("undefined");
  });

  it("renders separate left and right bottom-downbeat lanes", async () => {
    const html = await render(fixture(DownbeatTimeline, { downbeatOffset: 0.75 }));

    expect(html).toContain("Bottom downbeat timeline");
    expect(html).toContain("Separate left and right lanes");
    expect(html).toContain("Right downbeat is at 3/4");
  });

  it("renders wall-height waves without claiming to be a pendulum", async () => {
    const html = await render(fixture(PhaseWaveDiagram, { downbeatOffset: 0.5 }));

    expect(html).toContain("Wall-plane height waves");
    expect(html).toContain("Vertical position on the wall plane");
    expect(html).toContain("right bottom downbeat is offset by 2/4");
    expect(html).toContain(">L</text>");
    expect(html).toContain(">R</text>");
    expect(html.toLowerCase()).not.toContain("pendulum");
  });
});

describe("composed timing figures", () => {
  it("renders four familiar timing/direction panels without a nested figure", async () => {
    const html = await render(fixture(FamiliarTimingFigure));

    expect(html.match(/class="lab-figure-panel"/g)).toHaveLength(4);
    expect(html).toContain("Same time · same direction");
    expect(html).toContain("Split time · opposite directions");
    expect(html.match(/Wall-plane circular timing snapshot/g)).toHaveLength(16);
    expect(html).not.toContain("Bottom downbeat timeline");
    expect(html).not.toContain("<figure");
  });

  it("renders all four offset wave panels and the reference convention", async () => {
    const html = await render(fixture(OffsetWavesFigure));

    expect(html.match(/class="lab-figure-panel"/g)).toHaveLength(4);
    expect(html).toContain("left downbeat = 0");
    expect(html).toContain("R +¼");
    expect(html).toContain("L +¼");
    expect(html).not.toContain("<figure");
  });

  it("renders the two handed quarter forms and hand-swap relationship", async () => {
    const html = await render(fixture(HandedQuarterTimingFigure));

    expect(html.match(/class="lab-figure-panel"/g)).toHaveLength(2);
    expect(html).toContain("R +¼");
    expect(html).toContain("L +¼");
    expect(html).toContain("Swap L ↔ R");
    expect(html.match(/Wall-plane circular timing snapshot/g)).toHaveLength(2);
    expect(html.match(/Wall-plane height waves/g)).toHaveLength(2);
    expect(html).not.toContain("Bottom downbeat timeline");
    expect(html.toLowerCase()).not.toContain("leader");
    expect(html.toLowerCase()).not.toContain("follower");
    expect(html).not.toContain("<figure");
  });
});
