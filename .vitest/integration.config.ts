import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Read auth env vars for authenticating to the Forgejo instance.
    execArgv: ["--env-file=./src/test/integration/forgejo.env"],
    // We can't hit the shared Forgejo instance concurrently.
    fileParallelism: false,
    include: ["src/test/integration/**/*.test.ts"],
    setupFiles: ["./src/test/integration/setup.ts"],
    testTimeout: 30_000,
  },
});
