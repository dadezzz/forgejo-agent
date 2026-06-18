import { defineConfig } from "rolldown";

export default defineConfig({
  platform: "node",
  input: "src/main.ts",
  output: {
    // Nodejs SEA needs a single module file.
    codeSplitting: false,
  },
});
