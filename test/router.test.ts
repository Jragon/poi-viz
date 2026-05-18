import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script, createContext } from "node:vm";

import * as ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";

type RecordedRoute = {
  path: string;
  name: string;
  component: unknown;
};

type RouterOptions = {
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
  ]
]);
const lazyThreeDDebugPageModule = { default: { name: "Three3DDebugPage" } };
const threeDDebugRouteMetaModule = {
  THREE_D_DEBUG_ROUTE: {
    path: "/lab/three-d-debug",
    name: "three-d-debug"
  },
  loadThreeDDebugPage: () => Promise.resolve(lazyThreeDDebugPageModule)
};

describe("router", () => {
  let createRouterSpy: ReturnType<typeof vi.fn>;
  let createWebHistorySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createRouterSpy = vi.fn((options: RouterOptions) => ({ options }));
    createWebHistorySpy = vi.fn((base: string) => ({ base }));
  });

  it("registers the three-d-debug route as a lazy-loaded page", async () => {
    const routerExports = evaluateRouterModule(createRouterSpy, createWebHistorySpy);

    expect(routerExports).toHaveProperty("router");
    expect(createRouterSpy).toHaveBeenCalledTimes(1);

    const [routerOptions] = createRouterSpy.mock.calls[0] as [RouterOptions];
    const route = routerOptions.routes.find((candidate) => candidate.path === "/lab/three-d-debug");

    expect(route).toMatchObject({
      path: "/lab/three-d-debug",
      name: "three-d-debug"
    });
    expect(route?.component).toEqual(expect.any(Function));

    const loadedModule = await (route?.component as () => Promise<unknown>)();
    expect(loadedModule).toBe(lazyThreeDDebugPageModule);
  });
});

function evaluateRouterModule(
  createRouter: ReturnType<typeof vi.fn>,
  createWebHistory: ReturnType<typeof vi.fn>
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
    ["@/lab/experiments/three-d-debug/routeMeta", threeDDebugRouteMetaModule],
    ["@/lab/experiments/three-d-debug/Three3DDebugPage.vue", lazyThreeDDebugPageModule]
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
