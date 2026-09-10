import { describe, expect, it } from "vitest";
import { getLatestCommitId } from "../../git.ts";

describe("getLatestCommitId", () => {
  it("returns a 40-character hex string", () => {
    expect(getLatestCommitId()).toMatch(/^[0-9a-f]{40}$/);
  });
});
