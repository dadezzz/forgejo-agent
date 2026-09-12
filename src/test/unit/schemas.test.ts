import { describe, expect, it } from "vitest";
import Value from "typebox/value";
import {
  eventNameSchema,
  issueStateSchema,
  prReviewCommentSchema,
  prReviewEventSchema,
  prReviewSchema,
} from "../../schemas.ts";

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

describe("prReviewEventSchema", () => {
  it("accepts the three review verdicts", () => {
    for (const event of ["APPROVED", "REQUEST_CHANGES", "COMMENT"]) {
      expect(Value.Check(prReviewEventSchema, event)).toBe(true);
    }
  });

  it("rejects pending and unknown events", () => {
    expect(Value.Check(prReviewEventSchema, "PENDING")).toBe(false);
    expect(Value.Check(prReviewEventSchema, "DISMISSED")).toBe(false);
  });
});

describe("prReviewSchema", () => {
  const review = {
    id: 1,
    body: "looks good",
    user: { username: "ci-bot" },
    state: "APPROVED",
    commit_id: "abc123",
    submitted_at: "2024-01-01T00:00:00Z",
  };

  it("accepts a full review payload", () => {
    expect(Value.Check(prReviewSchema, review)).toBe(true);
  });

  it("accepts a pending review payload", () => {
    expect(Value.Check(prReviewSchema, { ...review, state: "PENDING" })).toBe(true);
  });

  it("rejects a review without a verdict", () => {
    const { state: _state, ...withoutState } = review;
    expect(Value.Check(prReviewSchema, withoutState)).toBe(false);
  });

  it("rejects a review without a commit", () => {
    const { commit_id: _commit, ...withoutCommit } = review;
    expect(Value.Check(prReviewSchema, withoutCommit)).toBe(false);
  });
});

describe("prReviewCommentSchema", () => {
  const comment = {
    body: "this line is wrong",
    user: { username: "ci-bot" },
    path: "src/main.ts",
    position: 42,
    created_at: "2024-01-01T00:00:00Z",
  };

  it("accepts a full inline comment payload", () => {
    expect(Value.Check(prReviewCommentSchema, comment)).toBe(true);
  });

  it("accepts a comment without a position", () => {
    expect(Value.Check(prReviewCommentSchema, { ...comment, position: null })).toBe(true);
  });

  it("rejects a comment without a path", () => {
    const { path: _path, ...withoutPath } = comment;
    expect(Value.Check(prReviewCommentSchema, withoutPath)).toBe(false);
  });
});
