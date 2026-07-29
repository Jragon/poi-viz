import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script, createContext } from "node:vm";

import * as ts from "typescript";

export type RecordedRoute = {
  path: string;
  name: string;
  component: unknown;
};

export type RouterOptions = {
  routes: RecordedRoute[];
};

const ROUTER_FILE = resolve(process.cwd(), "src/router.ts");
const eagerPageModules = new Map<string, { default: { name: string } }>([
  ["@/pages/VisualizerPage.vue", { default: { name: "VisualizerPage" } }],
  ["@/pages/AuthoringPage.vue", { default: { name: "AuthoringPage" } }],
  [
    "@/lab/experiments/quarter-time/QuarterTimeJournalPage.vue",
    { default: { name: "QuarterTimeJournalPage" } }
  ],
  [
    "@/lab/experiments/archer-weaves/ArcherWeavesJournalPage.vue",
    { default: { name: "ArcherWeavesJournalPage" } }
  ],
  [
    "@/lab/experiments/body-tracing/BodyTracingJournalPage.vue",
    { default: { name: "BodyTracingJournalPage" } }
  ],
  [
    "@/lab/experiments/body-tracing/BodyTracingPlaneExperimentsPage.vue",
    { default: { name: "BodyTracingPlaneExperimentsPage" } }
  ],
  [
    "@/lab/experiments/mel-body-tracing/pages/BodyTracingExplorerPage.vue",
    { default: { name: "BodyTracingExplorerPage" } }
  ],
  [
    "@/lab/experiments/mel-body-tracing/pages/BeatGraphEditorPage.vue",
    { default: { name: "BeatGraphEditorPage" } }
  ],
  [
    "@/lab/experiments/qt-stall-graph/StallGraphJournalPage.vue",
    { default: { name: "StallGraphJournalPage" } }
  ],
  [
    "@/lab/experiments/qt-stall-graph/QuarterTimingDirectionJournalPage.vue",
    { default: { name: "QuarterTimingDirectionJournalPage" } }
  ],
  [
    "@/lab/experiments/qt-stall-graph/StallGraphLayoutPage.vue",
    { default: { name: "StallGraphLayoutPage" } }
  ]
]);

export function evaluateRouterModule(
  createRouter: unknown,
  createWebHistory: unknown,
  additionalStubs: readonly (readonly [string, unknown])[] = []
) {
  const routerSource = readFileSync(ROUTER_FILE, "utf8").replace("import.meta.env.BASE_URL", '"/"');
  const transpiledRouterSource = ts.transpileModule(routerSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: ROUTER_FILE
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  const moduleStubs = new Map<string, unknown>([
    ["vue-router", { createRouter, createWebHistory }],
    ...eagerPageModules,
    [
      "@/lab/experiments/pendulum/routeMeta",
      {
        PENDULUM_LAB_ROUTE: { path: "/lab/pendulum", name: "pendulum-lab" },
        loadPendulumLabPage: () => Promise.resolve({ default: { name: "PendulumLabPage" } })
      }
    ],
    [
      "@/lab/experiments/gravity/routeMeta",
      {
        GRAVITY_LAB_ROUTE: { path: "/lab/gravity", name: "gravity-lab" },
        loadGravityLabPage: () => Promise.resolve({ default: { name: "GravityLabPage" } })
      }
    ],
    [
      "@/lab/experiments/timing-orbit/routeMeta",
      {
        TIMING_ORBIT_LAB_ROUTE: {
          path: "/lab/timing-orbit",
          name: "timing-orbit-lab"
        },
        loadTimingOrbitLabPage: () =>
          Promise.resolve({ default: { name: "TimingOrbitLabPage" } })
      }
    ],
    [
      "@/lab/experiments/mel-turning/routeMeta",
      {
        MEL_TURNING_LAB_ROUTE: { path: "/lab/mel-turning", name: "mel-turning-lab" },
        loadMelTurningLabPage: () => Promise.resolve({ default: { name: "MelTurningLabPage" } })
      }
    ],
    ...additionalStubs
  ]);

  const context = createContext({
    exports: module.exports,
    module,
    Promise,
    require: (specifier: string) => {
      if (!moduleStubs.has(specifier)) {
        throw new Error(`Unexpected import: ${specifier}`);
      }

      return moduleStubs.get(specifier);
    }
  });

  new Script(transpiledRouterSource, { filename: ROUTER_FILE }).runInContext(context);

  return module.exports;
}
