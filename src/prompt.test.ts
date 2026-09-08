import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt.ts";
import type { AuthContext, EventContext } from "./context.ts";

const authCtx: AuthContext = {
  token: "test-token",
  username: "ci-bot",
};

const issueEventCtx: EventContext = {
  repository: { full_name: "owner/repo", default_branch: "main" },
  event: {
    type: "issue",
    number: 1,
    user: { username: "davide" },
    title: "tests",
    body: "propose a testing strategy",
    state: "open",
    pull_request: null,
    name: "issues_opened",
    comments: [],
  },
};

const prEventCtx: EventContext = {
  repository: { full_name: "owner/repo", default_branch: "main" },
  event: {
    type: "pull request",
    number: 3,
    user: { username: "davide" },
    title: "feat: add tests",
    body: "adds the test suite",
    state: "open",
    head: { label: "feature/tests" },
    base: { label: "main" },
    name: "pull_request_opened",
    comments: [],
  },
};

describe("buildPrompt", () => {
  it("builds an issue prompt with branch and tool instructions", () => {
    const prompt = buildPrompt(authCtx, issueEventCtx);

    expect(prompt).toContain(
      "You are the ci-bot user operating in the context of Forgejo issue number 1 in the repository owner/repo.",
    );
    expect(prompt).toContain("default branch: main");
    expect(prompt).toContain("create-pr");
    expect(prompt).toContain("create-issue-comment");
    expect(prompt).toContain("### start issue content from user davide ###");
    expect(prompt).toContain("# tests");
    expect(prompt).toContain("propose a testing strategy");
    expect(prompt).toContain("### end issue content ###");
  });

  it("builds a pull request prompt with upstream branch instructions", () => {
    const prompt = buildPrompt(authCtx, prEventCtx);

    expect(prompt).toContain("Forgejo pull request number 3");
    expect(prompt).toContain("upstream branch feature/tests that will merge into main");
    expect(prompt).toContain("commit and push them upstream or they will be lost");
    expect(prompt).not.toContain("create-pr");
  });

  it("instructs to report findings with create-pr-review when assigned as reviewer", () => {
    const ctx: EventContext = {
      ...prEventCtx,
      event: { ...prEventCtx.event, name: "pull_request_review_requested" },
    };

    const prompt = buildPrompt(authCtx, ctx);

    expect(prompt).toContain("You have been assigned as a reviewer of the pull request.");
    expect(prompt).toContain("create-pr-review");
    expect(prompt).not.toContain("create-issue-comment");
  });

  it("omits the body when it is empty", () => {
    const ctx: EventContext = {
      ...issueEventCtx,
      event: { ...issueEventCtx.event, body: "" },
    };

    const prompt = buildPrompt(authCtx, ctx);

    expect(prompt).toContain("### start issue content from user davide ###\n# tests\n### end issue content ###");
  });

  it("appends comments in order", () => {
    const ctx: EventContext = {
      ...issueEventCtx,
      event: {
        ...issueEventCtx.event,
        comments: [
          { user: { username: "davide" }, body: "first", id: 1 },
          { user: { username: "ci-bot" }, body: "second", id: 2 },
        ],
      },
    };

    const prompt = buildPrompt(authCtx, ctx);

    expect(prompt.indexOf("### start comment from davide ###")).toBeLessThan(
      prompt.indexOf("### start comment from ci-bot ###"),
    );
    expect(prompt.indexOf("first")).toBeLessThan(prompt.indexOf("second"));
  });
});
