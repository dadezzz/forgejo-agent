import { describe, expect, it } from "vitest";
import Value from "typebox/value";
import { eventNameSchema, issueStateSchema } from "../../schemas.ts";

describe("eventNameSchema", () => {
  it("accepts the four supported events", () => {
    for (const name of [
      "issue_comment_created",
      "issues_opened",
      "pull_request_opened",
      "pull_request_review_requested",
    ]) {
      expect(Value.Check(eventNameSchema, name)).toBe(true);
    }
  });

  it("rejects unknown events", () => {
    expect(Value.Check(eventNameSchema, "issues_closed")).toBe(false);
    expect(Value.Check(eventNameSchema, "")).toBe(false);
  });
});

describe("issueStateSchema", () => {
  it("accepts open and closed states", () => {
    expect(Value.Check(issueStateSchema, "open")).toBe(true);
    expect(Value.Check(issueStateSchema, "closed")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(Value.Check(issueStateSchema, "merged")).toBe(false);
    expect(Value.Check(issueStateSchema, "")).toBe(false);
  });
});
