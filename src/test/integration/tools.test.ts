// Integration tests for the tools (src/tools.ts) against a real Forgejo
// instance. The tools execute against the live REST API; the only module that
// is mocked is @earendil-works/pi-coding-agent (defineTool is just a metadata
// factory — see the unit tests for the reason) and the git HEAD resolution of
// create-pr-review is exercised by running it from a checkout of the PR head
// branch.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getEventContext, type EventContext } from "../../context.ts";
import {
  createBranch,
  getIssue,
  getIssueComments,
  getPrReviewComments,
  getPrReviews,
  postIssue,
  postPr,
  searchIssues,
  searchPrs,
} from "../../forgejo/index.ts";
import {
  createCloseIssueTool,
  createCreateIssueCommentTool,
  createCreateIssueTool,
  createCreatePrReviewTool,
  createCreatePrTool,
} from "../../tools.ts";
import {
  apiCtx,
  BASE_BRANCH,
  FORGEJO_USERNAME,
  HEAD_BRANCH,
  INLINE_POSITION,
  SEED_ISSUE_NUMBER,
  SEED_REPOSITORY,
} from "./shared.ts";
import { simpleExecute } from "../utils.ts";

describe("tools against a real instance", () => {
  let eventCtx: EventContext;

  beforeAll(async () => {
    // Assemble the event context from the seeded issue, the same way the agent
    // would receive it, so the tools resolve their default repository and
    // issue from live data.
    vi.stubEnv("FORGEJO_REPOSITORY", SEED_REPOSITORY);
    vi.stubEnv("CTX_ISSUE_NUMBER", String(SEED_ISSUE_NUMBER));
    vi.stubEnv("CTX_EVENT_NAME", "issues_opened");
    eventCtx = await getEventContext(apiCtx);
  });

  afterAll(() => vi.unstubAllEnvs());

  it("create-issue creates an issue", async () => {
    const title = `tool issue ${Date.now()}`;
    const tool = createCreateIssueTool(apiCtx, eventCtx);

    const result = await simpleExecute(tool, { title, body: "created by the tool" });

    expect(result).toEqual({
      content: [{ type: "text", text: expect.stringMatching(/^ok, created issue \d+$/) }],
      details: null,
    });

    const issues = await searchIssues(apiCtx, SEED_REPOSITORY, {});
    expect(issues.some((i) => i.title === title)).toBe(true);
  });

  it("create-issue-comment comments on the seeded issue", async () => {
    const body = `tool comment ${Date.now()}`;
    const tool = createCreateIssueCommentTool(apiCtx, eventCtx);

    const result = await simpleExecute(tool, { body, issueId: SEED_ISSUE_NUMBER });

    expect(result).toEqual({
      content: [{ type: "text", text: expect.stringMatching(/^ok, created comment \d+$/) }],
      details: null,
    });

    const comments = await getIssueComments(apiCtx, SEED_REPOSITORY, SEED_ISSUE_NUMBER);
    expect(comments.some((c) => c.body === body)).toBe(true);
  });

  it("close-issue closes an issue", async () => {
    const issue = await postIssue(apiCtx, SEED_REPOSITORY, { title: `close by tool ${Date.now()}`, body: "" });
    const tool = createCloseIssueTool(apiCtx, eventCtx);

    const result = await simpleExecute(tool, { issueId: issue.number });

    expect(result).toEqual({
      content: [{ type: "text", text: `ok, closed issue ${issue.number}` }],
      details: null,
    });

    const fetched = await getIssue(apiCtx, SEED_REPOSITORY, issue.number);
    expect(fetched.state).toBe("closed");
  });

  it("create-pr creates a pull request", async () => {
    const title = `tool pr ${Date.now()}`;
    // Forgejo only allows one open PR per head/base pair, so give this PR its
    // own branch (same diff as the provisioned change branch).
    const head = `tool-pr-${Date.now()}`;
    await createBranch(apiCtx, SEED_REPOSITORY, HEAD_BRANCH, head);
    const tool = createCreatePrTool(apiCtx, eventCtx);

    const result = await simpleExecute(tool, {
      title,
      body: "created by the tool",
      head,
      base: BASE_BRANCH,
    });

    expect(result).toEqual({
      content: [{ type: "text", text: expect.stringMatching(/^ok, created pull request \d+$/) }],
      details: null,
    });

    const pulls = await searchPrs(apiCtx, SEED_REPOSITORY, {});
    expect(pulls.some((p) => p.title === title)).toBe(true);
  });

  it("create-pr-review submits a review with an inline comment", async () => {
    const pr = await postPr(apiCtx, SEED_REPOSITORY, {
      title: `review by tool ${Date.now()}`,
      body: "",
      base: BASE_BRANCH,
      head: HEAD_BRANCH,
    });

    // getLatestCommitId() resolves the git HEAD of the process working
    // directory, so run the tool from a checkout of the PR head branch.
    const dir = mkdtempSync(join(tmpdir(), "agent-review-"));
    execFileSync("git", [
      "clone",
      "-q",
      "--single-branch",
      "--branch",
      HEAD_BRANCH,
      apiCtx.getAuthRepoUrl(SEED_REPOSITORY),
      dir,
    ]);
    execFileSync("git", ["-C", dir, "config", "user.name", FORGEJO_USERNAME]);
    execFileSync("git", ["-C", dir, "config", "user.email", `${FORGEJO_USERNAME}@example.com`]);

    const previousCwd = process.cwd();
    process.chdir(dir);
    try {
      const tool = createCreatePrReviewTool(apiCtx, eventCtx);

      const result = await simpleExecute(tool, {
        body: "review from the tool",
        verdict: "COMMENT",
        prId: pr.number,
        comments: [{ body: "inline from the tool", path: "README.md", line: INLINE_POSITION, side: "HEAD" }],
      });

      expect(result).toEqual({
        content: [{ type: "text", text: expect.stringMatching(/^ok, created review \d+ for pull request \d+$/) }],
        details: null,
      });
    } finally {
      process.chdir(previousCwd);
    }

    const reviews = await getPrReviews(apiCtx, SEED_REPOSITORY, pr.number);
    const review = reviews.find((r) => r.body === "review from the tool");
    expect.assert(review);

    const comments = await getPrReviewComments(apiCtx, SEED_REPOSITORY, pr.number, review.id);
    expect(comments.some((c) => c.body === "inline from the tool")).toBe(true);
  });
});
