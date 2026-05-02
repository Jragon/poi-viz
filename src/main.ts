import { createApp } from "vue";
import App from "./App.vue";
import PatternCell from "./lab/components/PatternCell.vue";
import QuarterTimeExplorer from "./lab/components/QuarterTimeExplorer.vue";
import { router } from "./router";
import "./style.css";

createApp(App)
  .component("PatternCell", PatternCell)
  .component("QuarterTimeExplorer", QuarterTimeExplorer)
  .use(router)
  .mount("#app");
