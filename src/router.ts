import { createRouter, createWebHistory } from "vue-router";

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
    }
  ]
});
