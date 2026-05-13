import { createRouter, createWebHistory } from "vue-router";

import ArcherWeavesJournalPage from "@/lab/experiments/archer-weaves/ArcherWeavesJournalPage.vue";
import BodyTracingJournalPage from "@/lab/experiments/body-tracing/BodyTracingJournalPage.vue";
import BodyTracingPlaneExperimentsPage from "@/lab/experiments/body-tracing/BodyTracingPlaneExperimentsPage.vue";
import CosmoExplorerPage from "@/lab/experiments/cosmo-explorer/CosmoExplorerPage.vue";
import PoiBeatGraphPage from "@/lab/experiments/poi-beat-graph/PoiBeatGraphPage.vue";
import QuarterTimeJournalPage from "@/lab/experiments/quarter-time/QuarterTimeJournalPage.vue";
import ReelExplorerPage from "@/lab/experiments/reel-explorer/ReelExplorerPage.vue";
import WrapExplorerPage from "@/lab/experiments/wrap-explorer/WrapExplorerPage.vue";
import AuthoringPage from "@/pages/AuthoringPage.vue";
import VisualizerPage from "@/pages/VisualizerPage.vue";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "visualizer",
      component: VisualizerPage
    },
    {
      path: "/authoring",
      name: "authoring",
      component: AuthoringPage
    },
    {
      path: "/lab/quarter-time-3d",
      name: "quarter-time-journal",
      component: QuarterTimeJournalPage
    },
    {
      path: "/lab/archer-weaves",
      name: "archer-weaves-journal",
      component: ArcherWeavesJournalPage
    },
    {
      path: "/lab/body-tracing",
      name: "body-tracing-journal",
      component: BodyTracingJournalPage
    },
    {
      path: "/lab/body-tracing/planes",
      name: "body-tracing-planes",
      component: BodyTracingPlaneExperimentsPage
    },
    {
      path: "/lab/poi-beat-graph",
      name: "poi-beat-graph",
      component: PoiBeatGraphPage
    },
    {
      path: "/lab/reel-explorer",
      name: "reel-explorer",
      component: ReelExplorerPage
    },
    {
      path: "/lab/wrap-explorer",
      name: "wrap-explorer",
      component: WrapExplorerPage
    },
    {
      path: "/lab/cosmo-explorer",
      name: "cosmo-explorer",
      component: CosmoExplorerPage
    }
  ]
});
