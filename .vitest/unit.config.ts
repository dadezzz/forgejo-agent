import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests live next to the sources. Integration tests run against a real
    // Forgejo instance via vitest.integration.config.ts and are intentionally
    // excluded from the default run (they need the instance up).
    include: ["src/**/*.test.ts"],
    unstubEnvs: true,
  },
});
