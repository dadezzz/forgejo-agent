import { describe, expect, it, vi } from "vitest";
import { basicApiCtx, mockIssue, mockApiCtx, mockPr, mockReview, tokenApiCtx } from "../fixtures.ts";
import { ApiContext, getEventContext } from "../../context.ts";
import { getIssue, getIssueComments, getPr, getPrReviewsWithComments, getRepository } from "../../forgejo/index.ts";

vi.mock(import("../../forgejo/index.ts"), () => ({
  getIssue: vi.fn(),
  getIssueComments: vi.fn(),
  getPr: vi.fn(),
  getPrReviewsWithComments: vi.fn(),
  getRepository: vi.fn(),
}));

describe("ApiContext", () => {
  it("parses variables from the environment", () => {
    expect.assert(!tokenApiCtx.auth.basic);

    vi.stubEnv("FORGEJO_API_URL", tokenApiCtx.url.toString());
    vi.stubEnv("CTX_AUTH_TOKEN", tokenApiCtx.auth.token);
    vi.stubEnv("CTX_AUTH_USERNAME", tokenApiCtx.auth.username);

    expect(ApiContext.fromEnv()).toEqual(tokenApiCtx);
  });

  it.for([
    { url: "http://forgejo:3000/ai/v1", token: "token-123", username: "ci-bot" },
    { url: "forgejo:3000/api/v1", token: "token-123", username: "ci-bot" },
    { url: "", token: "token-123", username: "ci-bot" },
    { url: "http://forgejo:3000/api/v1", token: "", username: "ci-bot" },
    { url: "http://forgejo:3000/api/v1", token: "token-123", username: "" },
  ])("throws when variables are missing or malformed", (badEnv) => {
    vi.stubEnv("FORGEJO_API_URL", badEnv.url);
    vi.stubEnv("CTX_AUTH_TOKEN", badEnv.token);
    vi.stubEnv("CTX_AUTH_USERNAME", badEnv.username);
    expect(() => ApiContext.fromEnv()).toThrow();
  });

  it("checks that the authorization header is correct", () => {
    expect(basicApiCtx.getAuthHttpHeader()).toBe("Basic dGVzdDp0ZXN0");
    expect(tokenApiCtx.getAuthHttpHeader()).toBe(`Token test`);
  });

  it("checks that the repo url isn't persisted inside the context", () => {
    // Make a copy of the old url.
    const oldUrl = new URL(mockApiCtx.url);
    mockApiCtx.getAuthRepoUrl("owner/repo");
    expect(mockApiCtx.url).toEqual(oldUrl);
  });

  it("checks that the repo url is correct", () => {
    expect(tokenApiCtx.getAuthRepoUrl("owner/repo")).toBe("http://test:test@forgejo:3000/owner/repo.git");
    expect(basicApiCtx.getAuthRepoUrl("owner/repo")).toBe("http://test:test@forgejo:3000/owner/repo.git");
  });
});

describe("getEventContext", () => {
  it("returns the repository and issue event with comments", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "owner/repo");
    vi.stubEnv("CTX_ISSUE_NUMBER", "1");
    vi.stubEnv("CTX_EVENT_NAME", "issues_opened");
    vi.mocked(getIssue).mockResolvedValue(mockIssue);
    vi.mocked(getIssueComments).mockResolvedValue([{ user: { username: "davide" }, body: "first", id: 1 }]);
    vi.mocked(getRepository).mockResolvedValue({ full_name: "owner/repo", default_branch: "main" });

    const ctx = await getEventContext(mockApiCtx);

    expect(getIssue).toHaveBeenCalledWith(mockApiCtx, "owner/repo", 1);
    expect(getPr).not.toHaveBeenCalled();
    expect(ctx.repository).toEqual({ full_name: "owner/repo", default_branch: "main" });
    expect(ctx.event.type).toBe("issue");
    expect(ctx.event.number).toBe(1);
    expect(ctx.event.name).toBe("issues_opened");
    expect(ctx.event.comments).toEqual([{ user: { username: "davide" }, body: "first", id: 1 }]);
  });

  it("fetches the pull request when the issue is a pull request", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "owner/repo");
    vi.stubEnv("CTX_ISSUE_NUMBER", "3");
    vi.stubEnv("CTX_EVENT_NAME", "pull_request_opened");
    vi.mocked(getIssue).mockResolvedValue({ ...mockIssue, number: 3, pull_request: {} });
    vi.mocked(getPr).mockResolvedValue(mockPr);
    vi.mocked(getIssueComments).mockResolvedValue([]);
    vi.mocked(getRepository).mockResolvedValue({ full_name: "owner/repo", default_branch: "main" });

    const ctx = await getEventContext(mockApiCtx);

    expect(getPr).toHaveBeenCalledWith(mockApiCtx, "owner/repo", 3);
    expect(getPrReviewsWithComments).not.toHaveBeenCalled();
    expect(ctx.event.type).toBe("pull request");
    if (ctx.event.type === "pull request") {
      expect(ctx.event.head.label).toBe("test");
      expect(ctx.event.base.label).toBe("main");
    }
  });

  it("fetches previous reviews with comments on a review request", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "owner/repo");
    vi.stubEnv("CTX_ISSUE_NUMBER", "3");
    vi.stubEnv("CTX_EVENT_NAME", "pull_request_review_requested");
    vi.mocked(getIssue).mockResolvedValue({ ...mockIssue, number: 3, pull_request: {} });
    vi.mocked(getPr).mockResolvedValue(mockPr);
    vi.mocked(getIssueComments).mockResolvedValue([]);
    vi.mocked(getPrReviewsWithComments).mockResolvedValue([mockReview]);
    vi.mocked(getRepository).mockResolvedValue({ full_name: "owner/repo", default_branch: "main" });

    const ctx = await getEventContext(mockApiCtx);

    expect(getPrReviewsWithComments).toHaveBeenCalledWith(mockApiCtx, "owner/repo", 3);
    expect(ctx.event.reviews).toEqual([mockReview]);
  });

  it("does not fetch reviews for non-review events", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "owner/repo");
    vi.stubEnv("CTX_ISSUE_NUMBER", "3");
    vi.stubEnv("CTX_EVENT_NAME", "pull_request_opened");
    vi.mocked(getIssue).mockResolvedValue({ ...mockIssue, number: 3, pull_request: {} });
    vi.mocked(getPr).mockResolvedValue(mockPr);
    vi.mocked(getIssueComments).mockResolvedValue([]);
    vi.mocked(getRepository).mockResolvedValue({ full_name: "owner/repo", default_branch: "main" });

    const ctx = await getEventContext(mockApiCtx);

    expect(getPrReviewsWithComments).not.toHaveBeenCalled();
    expect(ctx.event.reviews).toBeNull();
  });

  it("throws on an invalid repository name", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "no-slash");
    vi.stubEnv("CTX_ISSUE_NUMBER", "1");
    vi.stubEnv("CTX_EVENT_NAME", "issues_opened");

    await expect(getEventContext(mockApiCtx)).rejects.toThrow();
  });

  it("throws on an unsupported event name", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "owner/repo");
    vi.stubEnv("CTX_ISSUE_NUMBER", "1");
    vi.stubEnv("CTX_EVENT_NAME", "issues_closed");
    vi.mocked(getIssue).mockResolvedValue(mockIssue);

    await expect(getEventContext(mockApiCtx)).rejects.toThrow();
  });
});
