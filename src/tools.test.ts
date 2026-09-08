import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// tools.ts imports `defineTool` from the pi-coding-agent package. The package's
// index re-exports `main`, which transitively loads an experimental server
// module that imports `@earendil-works/pi-server` (not installed; the real build
// tree-shakes it away). Mock the package so tests don't load that module graph.
vi.mock("@earendil-works/pi-coding-agent", () => ({
  defineTool: (tool: unknown) => tool,
}));

vi.mock("./forgejo/index.ts", () => ({
  patchIssue: vi.fn(),
  postIssue: vi.fn(),
  postIssueComment: vi.fn(),
  postPrReview: vi.fn(),
  postPullRequest: vi.fn(),
}));
vi.mock("./git.ts", () => ({
  getLatestCommitId: () => "abc123",
}));

import { patchIssue, postIssue, postIssueComment, postPrReview, postPullRequest } from "./forgejo/index.ts";
import {
  createCloseIssueTool,
  createCreateIssueCommentTool,
  createCreateIssueTool,
  createCreatePrReviewTool,
  createCreatePrTool,
} from "./tools.ts";

const mockedPatchIssue = vi.mocked(patchIssue);
const mockedPostIssue = vi.mocked(postIssue);
const mockedPostIssueComment = vi.mocked(postIssueComment);
const mockedPostPrReview = vi.mocked(postPrReview);
const mockedPostPullRequest = vi.mocked(postPullRequest);

// Mock call history accumulates across tests; clear it so tests stay
// order-independent (same hygiene as context.test.ts).
afterEach(() => vi.clearAllMocks());

// The tools' execute signature takes extra runtime args (signal, onUpdate, ctx)
// that are irrelevant for these tests.
const execute = (tool: unknown, params: unknown) =>
  (tool as { execute: (id: string, params: unknown) => Promise<unknown> }).execute("call-1", params);

const mockIssue = {
  number: 1,
  user: { username: "ci-bot" },
  title: "t",
  body: "b",
  state: "closed",
  pull_request: null,
};

describe("createCloseIssueTool", () => {
  beforeEach(() => mockedPatchIssue.mockResolvedValue(mockIssue));

  it("closes the default issue in the default repository", async () => {
    const tool = createCloseIssueTool("owner/repo", 1);

    const result = await execute(tool, {});

    expect(mockedPatchIssue).toHaveBeenCalledWith("owner/repo", 1, { state: "closed" });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, closed issue 1" }], details: null });
  });

  it("uses explicit repository and issueId when provided", async () => {
    const tool = createCloseIssueTool("owner/repo", 1);

    await execute(tool, { repository: "other/repo", issueId: 7 });

    expect(mockedPatchIssue).toHaveBeenCalledWith("other/repo", 7, { state: "closed" });
  });
});

describe("createCreateIssueTool", () => {
  beforeEach(() => mockedPostIssue.mockResolvedValue(mockIssue));

  it("creates an issue in the default repository", async () => {
    const tool = createCreateIssueTool("owner/repo");

    const result = await execute(tool, { title: "t", body: "b" });

    expect(mockedPostIssue).toHaveBeenCalledWith("owner/repo", { title: "t", body: "b" });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, created issue 1" }], details: null });
  });
});

describe("createCreateIssueCommentTool", () => {
  beforeEach(() => mockedPostIssueComment.mockResolvedValue({ user: { username: "ci-bot" }, body: "b", id: 5 }));

  it("comments on the default issue in the default repository", async () => {
    const tool = createCreateIssueCommentTool("owner/repo", 1);

    const result = await execute(tool, { body: "hello" });

    expect(mockedPostIssueComment).toHaveBeenCalledWith("owner/repo", 1, { body: "hello" });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, created comment 5" }], details: null });
  });

  it("uses explicit repository and issueId when provided", async () => {
    const tool = createCreateIssueCommentTool("owner/repo", 1);

    await execute(tool, { repository: "other/repo", issueId: 9, body: "hello" });

    expect(mockedPostIssueComment).toHaveBeenCalledWith("other/repo", 9, { body: "hello" });
  });
});

const mockPr = {
  number: 3,
  user: { username: "ci-bot" },
  title: "t",
  body: "b",
  state: "open",
  head: { label: "feature/x" },
  base: { label: "main" },
};

describe("createCreatePrTool", () => {
  beforeEach(() => mockedPostPullRequest.mockResolvedValue(mockPr));

  it("creates a pull request in the default repository", async () => {
    const tool = createCreatePrTool("owner/repo");

    const result = await execute(tool, { title: "t", body: "b", head: "feature/x", base: "main" });

    expect(mockedPostPullRequest).toHaveBeenCalledWith("owner/repo", {
      title: "t",
      body: "b",
      head: "feature/x",
      base: "main",
    });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, created pull request 3" }], details: null });
  });
});

describe("createCreatePrReviewTool", () => {
  beforeEach(() => mockedPostPrReview.mockResolvedValue({ id: 7, body: "ok" }));

  it("maps HEAD/BASE comments to new/old positions", async () => {
    const tool = createCreatePrReviewTool("owner/repo", 3);

    const result = await execute(tool, {
      body: "review",
      verdict: "APPROVED",
      comments: [
        { body: "on new code", path: "src/main.ts", line: 10, side: "HEAD" },
        { body: "on old code", path: "src/main.ts", line: 5, side: "BASE" },
      ],
    });

    expect(mockedPostPrReview).toHaveBeenCalledWith("owner/repo", 3, {
      body: "review",
      event: "APPROVED",
      commit_id: "abc123",
      comments: [
        { body: "on new code", path: "src/main.ts", new_position: 10, old_position: 0 },
        { body: "on old code", path: "src/main.ts", new_position: 0, old_position: 5 },
      ],
    });
    expect(result).toEqual({
      content: [{ type: "text", text: "ok, created review 7 for pull request 3" }],
      details: null,
    });
  });

  it("uses explicit prId when provided", async () => {
    const tool = createCreatePrReviewTool("owner/repo", 3);

    await execute(tool, { body: "review", verdict: "COMMENT", comments: [], prId: 9 });

    expect(mockedPostPrReview).toHaveBeenCalledWith("owner/repo", 9, expect.objectContaining({ event: "COMMENT" }));
  });
});
