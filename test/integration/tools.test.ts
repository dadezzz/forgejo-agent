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
import { describe, expect, it, vi } from "vitest";

vi.mock("@earendil-works/pi-coding-agent", () => ({
  defineTool: (tool: unknown) => tool,
}));

import {
  createCloseIssueTool,
  createCreateIssueCommentTool,
  createCreateIssueTool,
  createCreatePrReviewTool,
  createCreatePrTool,
} from "../../src/tools.ts";
import { api, createIssue, createPullRequest, credentials, repositoryCloneUrl, type ReviewLike } from "./helpers.ts";

// The tools' execute signature takes extra runtime args (signal, onUpdate, ctx)
// that are irrelevant for these tests.
const execute = (tool: unknown, params: unknown) =>
  (tool as { execute: (id: string, params: unknown) => Promise<unknown> }).execute("call-1", params);

describe("tools against a real instance", () => {
  it("create-issue creates an issue", async () => {
    const title = `tool issue ${Date.now()}`;
    const tool = createCreateIssueTool(credentials.repository);

    const result = await execute(tool, { title, body: "created by the tool" });

    expect(result).toEqual({
      content: [{ type: "text", text: expect.stringMatching(/^ok, created issue \d+$/) }],
      details: null,
    });

    const issues = await api<{ title: string }[]>(`/repos/${credentials.repository}/issues?state=all&type=issues`);
    expect(issues.some((i) => i.title === title)).toBe(true);
  });

  it("create-issue-comment comments on the seeded issue", async () => {
    const body = `tool comment ${Date.now()}`;
    const tool = createCreateIssueCommentTool(credentials.repository, credentials.seedIssueNumber);

    const result = await execute(tool, { body });

    expect(result).toEqual({
      content: [{ type: "text", text: expect.stringMatching(/^ok, created comment \d+$/) }],
      details: null,
    });

    const comments = await api<{ body: string }[]>(
      `/repos/${credentials.repository}/issues/${credentials.seedIssueNumber}/comments`,
    );
    expect(comments.some((c) => c.body === body)).toBe(true);
  });

  it("close-issue closes an issue", async () => {
    const issue = await createIssue(`close by tool ${Date.now()}`, "body");
    const tool = createCloseIssueTool(credentials.repository, issue.number);

    const result = await execute(tool, {});

    expect(result).toEqual({
      content: [{ type: "text", text: `ok, closed issue ${issue.number}` }],
      details: null,
    });

    const fetched = await api<{ state: string }>(`/repos/${credentials.repository}/issues/${issue.number}`);
    expect(fetched.state).toBe("closed");
  });

  it("create-pr creates a pull request", async () => {
    const title = `tool pr ${Date.now()}`;
    // Forgejo only allows one open PR per head/base pair, so give this PR its
    // own branch (same diff as the provisioned change branch).
    const head = `tool-pr-${Date.now()}`;
    await api(`/repos/${credentials.repository}/branches`, {
      method: "POST",
      body: JSON.stringify({ new_branch_name: head, old_branch_name: credentials.headBranch }),
    });
    const tool = createCreatePrTool(credentials.repository);

    const result = await execute(tool, {
      title,
      body: "created by the tool",
      head,
      base: credentials.baseBranch,
    });

    expect(result).toEqual({
      content: [{ type: "text", text: expect.stringMatching(/^ok, created pull request \d+$/) }],
      details: null,
    });

    const pulls = await api<{ title: string }[]>(`/repos/${credentials.repository}/pulls?state=all`);
    expect(pulls.some((p) => p.title === title)).toBe(true);
  });

  it("create-pr-review submits a review with an inline comment", async () => {
    const pr = await createPullRequest(`review by tool ${Date.now()}`);

    // getLatestCommitId() resolves the git HEAD of the process working
    // directory, so run the tool from a checkout of the PR head branch.
    const dir = mkdtempSync(join(tmpdir(), "agent-review-"));
    execFileSync("git", [
      "clone",
      "-q",
      "--single-branch",
      "--branch",
      credentials.headBranch,
      repositoryCloneUrl(),
      dir,
    ]);
    execFileSync("git", ["-C", dir, "config", "user.name", "CI [bot]"]);
    execFileSync("git", ["-C", dir, "config", "user.email", `${credentials.username}@example.com`]);

    const previousCwd = process.cwd();
    process.chdir(dir);
    try {
      const tool = createCreatePrReviewTool(credentials.repository, pr.number);

      const result = await execute(tool, {
        body: "review from the tool",
        verdict: "COMMENT",
        comments: [{ body: "inline from the tool", path: "README.md", line: credentials.inlinePosition, side: "HEAD" }],
      });

      expect(result).toEqual({
        content: [{ type: "text", text: expect.stringMatching(/^ok, created review \d+ for pull request \d+$/) }],
        details: null,
      });
    } finally {
      process.chdir(previousCwd);
    }

    const reviews = await api<ReviewLike[]>(`/repos/${credentials.repository}/pulls/${pr.number}/reviews`);
    const review = reviews.find((r) => r.body === "review from the tool");
    expect(review).toBeDefined();

    const comments = review
      ? await api<{ body: string }[]>(
          `/repos/${credentials.repository}/pulls/${pr.number}/reviews/${review.id}/comments`,
        )
      : [];
    expect(comments.some((c) => c.body === "inline from the tool")).toBe(true);
  });
});
