import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/integration/setup.ts"],
    include: ["test/integration/**/*.test.ts"],
    // Integration tests share one Forgejo instance and create their own data;
    // running files sequentially keeps them order-independent.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
