import { describe, expect, it } from "vitest";
import { buildPrompt } from "../../prompt.ts";
import type { EventContext } from "../../context.ts";
import {
  mockNewIssueEventCtx,
  mockApiCtx,
  mockNewPrEventCtx,
  mockReview,
  mockReviewRequestedEventCtx,
} from "../fixtures.ts";

describe("buildPrompt", () => {
  it("builds an issue prompt", () => {
    const prompt = buildPrompt(mockApiCtx, mockNewIssueEventCtx);

    expect(prompt).toContain(
      `You are the ${mockApiCtx.auth.username} user operating in the context of Forgejo issue number 1 in the repository owner/repo.`,
    );
    expect(prompt).toContain("default branch: main");
    expect(prompt).toContain("create-pr");
    expect(prompt).toContain("create-issue-comment");
    expect(prompt).toContain("### start issue content from user test ###");
    expect(prompt).toContain("# tests");
    expect(prompt).toContain("propose a testing strategy");
    expect(prompt).toContain("### end issue content ###");
  });

  it("builds a pull request prompt", () => {
    const prompt = buildPrompt(mockApiCtx, mockNewPrEventCtx);

    expect(prompt).toContain("Forgejo pull request number 3");
    expect(prompt).toContain("upstream branch feature/tests that will merge into main");
    expect(prompt).toContain("commit and push them upstream or they will be lost");
    expect(prompt).not.toContain("create-pr");
  });

  it("instructs to report findings with create-pr-review when assigned as reviewer", () => {
    const ctx: EventContext = {
      ...mockNewPrEventCtx,
      event: { ...mockNewPrEventCtx.event, name: "pull_request_review_requested" },
    };
    const prompt = buildPrompt(mockApiCtx, ctx);

    expect(prompt).toContain("You have been assigned as a reviewer of the pull request.");
    expect(prompt).toContain("create-pr-review");
    expect(prompt).not.toContain("create-issue-comment");
  });

  it("adds successive review guidance and previous reviews when reviews exist", () => {
    const prompt = buildPrompt(mockApiCtx, mockReviewRequestedEventCtx);

    expect(prompt).toContain("This pull request has already been reviewed before");
    expect(prompt).toContain("acknowledge the ones that are fixed");
    expect(prompt).toContain("re-raise the ones that are still open");
    expect(prompt).toContain("### start previous reviews ###");
    expect(prompt).toContain("### start review from test ###");
    expect(prompt).toContain("State: REQUEST_CHANGES");
    expect(prompt).toContain("Commit: abc123");
    expect(prompt).toContain("found an issue");
    expect(prompt).toContain("### start review comment from test ###");
    expect(prompt).toContain("Path: src/main.ts, line: 42");
    expect(prompt).toContain("this line is wrong");
    expect(prompt).toContain("### end previous reviews ###");
  });

  it("omits the previous reviews section when there are no reviews", () => {
    const ctx: EventContext = {
      ...mockNewPrEventCtx,
      event: { ...mockNewPrEventCtx.event, name: "pull_request_review_requested" },
    };
    const prompt = buildPrompt(mockApiCtx, ctx);

    expect(prompt).not.toContain("already been reviewed before");
    expect(prompt).not.toContain("### start previous reviews ###");
  });

  it("omits the line when the review comment has no line", () => {
    const ctx: EventContext = {
      ...mockReviewRequestedEventCtx,
      event: {
        ...mockReviewRequestedEventCtx.event,
        reviews: [{ ...mockReview, comments: [{ ...mockReview.comments[0], position: null }] }],
      },
    };
    const prompt = buildPrompt(mockApiCtx, ctx);

    expect(prompt).toContain("Path: src/main.ts");
    expect(prompt).not.toContain("line: null");
  });

  it("omits the body when it is empty", () => {
    const ctx: EventContext = {
      ...mockNewIssueEventCtx,
      event: { ...mockNewIssueEventCtx.event, body: "" },
    };
    const prompt = buildPrompt(mockApiCtx, ctx);

    expect(prompt).toContain("### start issue content from user test ###\n# tests\n### end issue content ###");
  });

  it("appends comments in order", () => {
    const ctx: EventContext = {
      ...mockNewIssueEventCtx,
      event: {
        ...mockNewIssueEventCtx.event,
        comments: [
          { user: { username: "test1" }, body: "first", id: 1 },
          { user: { username: "test2" }, body: "second", id: 2 },
        ],
      },
    };
    const prompt = buildPrompt(mockApiCtx, ctx);

    expect(prompt.indexOf("### start comment from test1 ###")).toBeLessThan(
      prompt.indexOf("### start comment from test2 ###"),
    );
    expect(prompt.indexOf("first")).toBeLessThan(prompt.indexOf("second"));
  });
});
