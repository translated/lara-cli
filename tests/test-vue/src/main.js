import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import getI18n from "./i18n";

// Initialize app with async i18n
async function initApp() {
  const i18n = await getI18n();
  createApp(App).use(i18n).mount("#app");
}

initApp().catch(console.error);
