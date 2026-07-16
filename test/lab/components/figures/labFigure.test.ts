import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, type Component } from "vue";

import LabFigure from "@/lab/components/figures/LabFigure.vue";
import LabFigureGrid from "@/lab/components/figures/LabFigureGrid.vue";
import LabFigurePanel from "@/lab/components/figures/LabFigurePanel.vue";
import LabFigureRef from "@/lab/components/figures/LabFigureRef.vue";
import { assertValidLabFigureId } from "@/lab/components/figures/figureTypes";

async function render(component: Component): Promise<string> {
  return renderToString(createSSRApp(component));
}

function figureFixture(width: "compact" | "prose" | "wide" | "full") {
  return defineComponent({
    setup() {
      return () =>
        h(
          LabFigure,
          { id: "offset-cycle", width },
          {
            title: () => "Offset cycle",
            default: () => h("svg", { "aria-label": "Diagram" }),
            caption: () => "Four relationships"
          }
        );
    }
  });
}

describe("LabFigure", () => {
  it("renders a labelled native figure and caption with a stable anchor", async () => {
    const html = await render(figureFixture("wide"));

    expect(html).toContain('<figure id="offset-cycle"');
    expect(html).toContain('class="lab-figure lab-figure--wide"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-labelledby="offset-cycle-title"');
    expect(html).toContain('aria-describedby="offset-cycle-caption"');
    expect(html).toContain('<h3 id="offset-cycle-title"');
    expect(html).toContain("Offset cycle");
    expect(html).toContain('<figcaption id="offset-cycle-caption"');
    expect(html).toContain("Four relationships");
  });

  it.each(["compact", "prose", "wide", "full"] as const)(
    "renders the %s width modifier",
    async (width) => {
      expect(await render(figureFixture(width))).toContain(`lab-figure--${width}`);
    }
  );

  it("omits title and caption semantics when their slots are absent", async () => {
    const fixture = defineComponent({
      setup() {
        return () => h(LabFigure, { id: "unadorned-figure" }, () => "Content");
      }
    });
    const html = await render(fixture);

    expect(html).toContain('<figure id="unadorned-figure"');
    expect(html).not.toContain("aria-labelledby");
    expect(html).not.toContain("aria-describedby");
    expect(html).not.toContain("<figcaption");
  });
});

describe("LabFigureGrid", () => {
  it.each(["two-up", "four-strip", "matrix"] as const)(
    "renders the %s layout with its default slot",
    async (layout) => {
      const fixture = defineComponent({
        setup() {
          return () => h(LabFigureGrid, { layout }, () => h("span", "Panel"));
        }
      });
      const html = await render(fixture);

      expect(html).toContain(`lab-figure-grid--${layout}`);
      expect(html).toContain("<span>Panel</span>");
    }
  );

  it("renders explicit main and inset regions", async () => {
    const fixture = defineComponent({
      setup() {
        return () =>
          h(
            LabFigureGrid,
            { layout: "main-with-inset" },
            {
              main: () => h("span", "Main diagram"),
              inset: () => h("span", "Inset diagram")
            }
          );
      }
    });
    const html = await render(fixture);

    expect(html).toContain("lab-figure-grid--main-with-inset");
    expect(html).toContain('class="lab-figure-grid__main"');
    expect(html).toContain("Main diagram");
    expect(html).toContain('class="lab-figure-grid__inset"');
    expect(html).toContain("Inset diagram");
  });

  it("does not render an empty inset region", async () => {
    const fixture = defineComponent({
      setup() {
        return () =>
          h(LabFigureGrid, { layout: "main-with-inset" }, { main: () => h("span", "Main only") });
      }
    });
    const html = await render(fixture);

    expect(html).toContain('class="lab-figure-grid__main"');
    expect(html).not.toContain('class="lab-figure-grid__inset"');
  });
});

describe("LabFigurePanel", () => {
  it("renders an accessible labelled panel with optional title and content", async () => {
    const fixture = defineComponent({
      setup() {
        return () =>
          h(LabFigurePanel, { label: "A", title: "Same time" }, () => h("span", "Panel diagram"));
      }
    });
    const html = await render(fixture);

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="A: Same time"');
    expect(html).toContain('class="lab-figure-panel__label">A</span>');
    expect(html).toContain('class="lab-figure-panel__title">Same time</h4>');
    expect(html).toContain("Panel diagram");
  });

  it("uses the panel label as its accessible name when there is no title", async () => {
    const fixture = defineComponent({
      setup() {
        return () => h(LabFigurePanel, { label: "Downbeats" }, () => "Timeline");
      }
    });

    expect(await render(fixture)).toContain('aria-label="Downbeats"');
  });
});

describe("LabFigureRef", () => {
  it("links caller-authored text to the exact semantic figure ID", async () => {
    const fixture = defineComponent({
      setup() {
        return () => h(LabFigureRef, { figureId: "offset-cycle" }, () => "the offset cycle");
      }
    });
    const html = await render(fixture);

    expect(html).toContain('<a class="lab-figure-ref" href="#offset-cycle">');
    expect(html).toContain("the offset cycle");
  });
});

describe("figure composition", () => {
  it("renders a figure containing a responsive grid of panels", async () => {
    const fixture = defineComponent({
      setup() {
        const panel = (label: string, title: string) =>
          h(LabFigurePanel, { label, title }, () => h("span", `${title} diagram`));

        return () =>
          h(
            LabFigure,
            { id: "familiar-timing", width: "full" },
            {
              title: () => "Familiar timing",
              default: () =>
                h(LabFigureGrid, { layout: "two-up" }, () => [
                  panel("A", "Same time"),
                  panel("B", "Split time")
                ]),
              caption: () => "Two familiar relationships"
            }
          );
      }
    });
    const html = await render(fixture);

    expect(html).toContain('id="familiar-timing"');
    expect(html).toContain("lab-figure-grid--two-up");
    expect(html).toContain('aria-label="A: Same time"');
    expect(html).toContain('aria-label="B: Split time"');
    expect(html).toContain("Two familiar relationships");
  });
});

describe("figure ID validation", () => {
  it.each([
    "Offset-Waves",
    "offset_waves",
    "2-offsets",
    "offset--waves",
    "offset waves",
    "offset-waves\n",
    ""
  ])("rejects invalid ID %j", (id) => {
    expect(() => assertValidLabFigureId(id)).toThrow(/Invalid lab figure ID/);
  });

  it("rejects an invalid figure ID while rendering", async () => {
    const fixture = defineComponent({
      setup() {
        return () => h(LabFigure, { id: "Invalid ID" }, () => "Content");
      }
    });

    await expect(render(fixture)).rejects.toThrow(/Invalid lab figure ID/);
  });

  it("rejects an invalid reference ID while rendering", async () => {
    const fixture = defineComponent({
      setup() {
        return () => h(LabFigureRef, { figureId: "Invalid ID" }, () => "Reference");
      }
    });

    await expect(render(fixture)).rejects.toThrow(/Invalid lab figure ID/);
  });
});
