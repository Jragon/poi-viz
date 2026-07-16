import { createRouter, createWebHistory } from "vue-router";

import ArcherWeavesJournalPage from "@/lab/experiments/archer-weaves/ArcherWeavesJournalPage.vue";
import BodyTracingJournalPage from "@/lab/experiments/body-tracing/BodyTracingJournalPage.vue";
import BodyTracingPlaneExperimentsPage from "@/lab/experiments/body-tracing/BodyTracingPlaneExperimentsPage.vue";
import BeatGraphEditorPage from "@/lab/experiments/mel-body-tracing/pages/BeatGraphEditorPage.vue";
import BodyTracingExplorerPage from "@/lab/experiments/mel-body-tracing/pages/BodyTracingExplorerPage.vue";
import QuarterTimingDirectionJournalPage from "@/lab/experiments/qt-stall-graph/QuarterTimingDirectionJournalPage.vue";
import StallGraphJournalPage from "@/lab/experiments/qt-stall-graph/StallGraphJournalPage.vue";
import StallGraphLayoutPage from "@/lab/experiments/qt-stall-graph/StallGraphLayoutPage.vue";
import QuarterTimeJournalPage from "@/lab/experiments/quarter-time/QuarterTimeJournalPage.vue";
import {
  THREE_D_DEBUG_ROUTE,
  loadThreeDDebugPage
} from "@/lab/experiments/three-d-debug/routeMeta";
import { VRM_RIG_ROUTE, loadVrmRigLabPage } from "@/lab/experiments/vrm-rig/routeMeta";
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
      path: "/lab/qt-stall-graph",
      name: "qt-stall-graph",
      component: StallGraphJournalPage
    },
    {
      path: "/lab/quarter-timing-direction",
      name: "quarter-timing-direction-journal",
      component: QuarterTimingDirectionJournalPage
    },
    {
      path: "/lab/qt-stall-graph/layout",
      name: "qt-stall-graph-layout",
      component: StallGraphLayoutPage
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
      path: "/lab/body-tracing-explorer",
      name: "body-tracing-explorer",
      component: BodyTracingExplorerPage
    },
    {
      path: "/lab/beat-graph",
      name: "beat-graph-editor",
      component: BeatGraphEditorPage
    },
    {
      ...THREE_D_DEBUG_ROUTE,
      component: loadThreeDDebugPage
    },
    {
      ...VRM_RIG_ROUTE,
      component: loadVrmRigLabPage
    }
  ]
});
