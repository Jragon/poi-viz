import { createRouter, createWebHistory } from "vue-router";

import ArcherWeavesJournalPage from "@/experiments/archerWeaves/ArcherWeavesJournalPage.vue";
import QuarterTimeJournalPage from "@/experiments/quarterTime/QuarterTimeJournalPage.vue";
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
    }
  ]
});
