import { describe, expect, it, vi } from "vitest";
import { patchIssue, postIssue, postIssueComment, postPrReview, postPr } from "./forgejo/index.ts";
import {
  createCloseIssueTool,
  createCreateIssueCommentTool,
  createCreateIssueTool,
  createCreatePrReviewTool,
  createCreatePrTool,
} from "./tools.ts";
import { mockIssue, mockApiCtx, mockNewIssueEventCtx, mockNewPrEventCtx, mockPr } from "./tests/unit/fixtures.ts";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { getLatestCommitId } from "./git.ts";

vi.mock(import("./forgejo/index.ts"), () => ({
  patchIssue: vi.fn(),
  postIssue: vi.fn(),
  postIssueComment: vi.fn(),
  postPrReview: vi.fn(),
  postPr: vi.fn(),
}));

vi.mocked(patchIssue).mockResolvedValue(mockIssue);
vi.mocked(postIssue).mockResolvedValue(mockIssue);
vi.mocked(postIssueComment).mockResolvedValue({ user: { username: "ci-bot" }, body: "b", id: 5 });
vi.mocked(postPrReview).mockResolvedValue({ id: 7, body: "ok" });
vi.mocked(postPr).mockResolvedValue(mockPr);

// The tools' execute signature takes extra runtime args (signal, onUpdate, ctx)
// that are irrelevant for these tests.
const execute = (tool: ToolDefinition, params: unknown) =>
  // @ts-expect-error Setting undefined works on the last arg.
  tool.execute("call-1", params, undefined, undefined, undefined);

describe("createCloseIssueTool", () => {
  it("closes the default issue in the default repository", async () => {
    const tool = createCloseIssueTool(mockApiCtx, mockNewIssueEventCtx);

    const result = await execute(tool, {});

    expect(patchIssue).toHaveBeenCalledWith(mockApiCtx, "owner/repo", 1, { state: "closed" });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, closed issue 1" }], details: null });
  });

  it("uses explicit repository and issueId when provided", async () => {
    const tool = createCloseIssueTool(mockApiCtx, mockNewIssueEventCtx);

    await execute(tool, { repository: "other/repo", issueId: 7 });

    expect(patchIssue).toHaveBeenCalledWith(mockApiCtx, "other/repo", 7, { state: "closed" });
  });
});

describe("createCreateIssueTool", () => {
  it("creates an issue in the default repository", async () => {
    const tool = createCreateIssueTool(mockApiCtx, mockNewIssueEventCtx);

    const result = await execute(tool, { title: "t", body: "b" });

    expect(postIssue).toHaveBeenCalledWith(mockApiCtx, "owner/repo", { title: "t", body: "b" });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, created issue 1" }], details: null });
  });
});

describe("createCreateIssueCommentTool", () => {
  it("comments on the default issue in the default repository", async () => {
    const tool = createCreateIssueCommentTool(mockApiCtx, mockNewIssueEventCtx);

    const result = await execute(tool, { body: "hello" });

    expect(postIssueComment).toHaveBeenCalledWith(mockApiCtx, "owner/repo", 1, { body: "hello" });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, created comment 5" }], details: null });
  });

  it("uses explicit repository and issueId when provided", async () => {
    const tool = createCreateIssueCommentTool(mockApiCtx, mockNewIssueEventCtx);

    await execute(tool, { repository: "other/repo", issueId: 9, body: "hello" });

    expect(postIssueComment).toHaveBeenCalledWith(mockApiCtx, "other/repo", 9, { body: "hello" });
  });
});

describe("createCreatePrTool", () => {
  it("creates a pull request in the default repository", async () => {
    const tool = createCreatePrTool(mockApiCtx, mockNewPrEventCtx);

    const result = await execute(tool, { title: "t", body: "b", head: "feature/x", base: "main" });

    expect(postPr).toHaveBeenCalledWith(mockApiCtx, "owner/repo", {
      title: "t",
      body: "b",
      head: "feature/x",
      base: "main",
    });
    expect(result).toEqual({ content: [{ type: "text", text: "ok, created pull request 3" }], details: null });
  });
});

describe("createCreatePrReviewTool", () => {
  it("maps HEAD/BASE comments to new/old positions", async () => {
    const tool = createCreatePrReviewTool(mockApiCtx, mockNewPrEventCtx);

    const result = await execute(tool, {
      body: "review",
      verdict: "APPROVED",
      comments: [
        { body: "on new code", path: "src/main.ts", line: 10, side: "HEAD" },
        { body: "on old code", path: "src/main.ts", line: 5, side: "BASE" },
      ],
    });

    expect(postPrReview).toHaveBeenCalledWith(mockApiCtx, "owner/repo", 3, {
      body: "review",
      event: "APPROVED",
      commit_id: getLatestCommitId(),
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
    const tool = createCreatePrReviewTool(mockApiCtx, mockNewPrEventCtx);

    await execute(tool, { body: "review", verdict: "COMMENT", comments: [], prId: 9 });

    expect(postPrReview).toHaveBeenCalledWith(
      mockApiCtx,
      "owner/repo",
      9,
      expect.objectContaining({ event: "COMMENT" }),
    );
  });
});
