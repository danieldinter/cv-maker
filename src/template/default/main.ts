import "./style.css";
import { mount } from "svelte";
import Index from "./Index.svelte";
import { applyDefaults } from "$lib/defaults";

// Import the generated merged CV and instance config which are written by the build/merge step
const data = JSON.parse(import.meta.env.VITE_CV_DATA);
const instanceConfig = JSON.parse(import.meta.env.VITE_CV_INSTANCE_CONFIG);

const app = mount(Index, {
  target: document.getElementById("app")!,
  props: {
    data,
    instanceConfig: applyDefaults(instanceConfig),
  },
});

export default app;
