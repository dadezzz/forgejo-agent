import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthContext, getEventContext } from "./context.ts";

vi.mock("./forgejo/index.ts", () => ({
  getIssue: vi.fn(),
  getIssueComments: vi.fn(),
  getPullRequest: vi.fn(),
  getRepository: vi.fn(),
}));

import { getIssue, getIssueComments, getPullRequest, getRepository } from "./forgejo/index.ts";

const mockedGetIssue = vi.mocked(getIssue);
const mockedGetIssueComments = vi.mocked(getIssueComments);
const mockedGetPullRequest = vi.mocked(getPullRequest);
const mockedGetRepository = vi.mocked(getRepository);

const issue = {
  number: 1,
  user: { username: "davide" },
  title: "tests",
  body: "body",
  state: "open",
  pull_request: null,
};

const pullRequest = {
  number: 3,
  user: { username: "davide" },
  title: "feat",
  body: "body",
  state: "open",
  head: { label: "feature/x" },
  base: { label: "main" },
};

describe("getAuthContext", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("parses token and username from the environment", () => {
    vi.stubEnv("CTX_AUTH_TOKEN", "token-123");
    vi.stubEnv("CTX_AUTH_USERNAME", "ci-bot");

    expect(getAuthContext()).toEqual({ token: "token-123", username: "ci-bot" });
  });

  it("throws when the token is missing", () => {
    vi.stubEnv("CTX_AUTH_TOKEN", "");
    vi.stubEnv("CTX_AUTH_USERNAME", "ci-bot");

    expect(() => getAuthContext()).toThrow();
  });

  it("throws when the username is missing", () => {
    vi.stubEnv("CTX_AUTH_TOKEN", "token-123");
    vi.stubEnv("CTX_AUTH_USERNAME", "");

    expect(() => getAuthContext()).toThrow();
  });
});

describe("getEventContext", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    // Needed to make the check at line 80 work.
    vi.clearAllMocks();
  });

  it("returns the repository and issue event with comments", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "owner/repo");
    vi.stubEnv("CTX_ISSUE_NUMBER", "1");
    vi.stubEnv("CTX_EVENT_NAME", "issues_opened");
    mockedGetIssue.mockResolvedValue(issue);
    mockedGetIssueComments.mockResolvedValue([{ user: { username: "davide" }, body: "first", id: 1 }]);
    mockedGetRepository.mockResolvedValue({ full_name: "owner/repo", default_branch: "main" });

    const ctx = await getEventContext();

    expect(mockedGetIssue).toHaveBeenCalledWith("owner/repo", 1);
    expect(mockedGetPullRequest).not.toHaveBeenCalled();
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
    mockedGetIssue.mockResolvedValue({ ...issue, number: 3, pull_request: {} });
    mockedGetPullRequest.mockResolvedValue(pullRequest);
    mockedGetIssueComments.mockResolvedValue([]);
    mockedGetRepository.mockResolvedValue({ full_name: "owner/repo", default_branch: "main" });

    const ctx = await getEventContext();

    expect(mockedGetPullRequest).toHaveBeenCalledWith("owner/repo", 3);
    expect(ctx.event.type).toBe("pull request");
    if (ctx.event.type === "pull request") {
      expect(ctx.event.head.label).toBe("feature/x");
      expect(ctx.event.base.label).toBe("main");
    }
  });

  it("throws on an invalid repository name", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "no-slash");
    vi.stubEnv("CTX_ISSUE_NUMBER", "1");
    vi.stubEnv("CTX_EVENT_NAME", "issues_opened");

    await expect(getEventContext()).rejects.toThrow();
  });

  it("throws on an unsupported event name", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", "owner/repo");
    vi.stubEnv("CTX_ISSUE_NUMBER", "1");
    vi.stubEnv("CTX_EVENT_NAME", "issues_closed");
    mockedGetIssue.mockResolvedValue(issue);

    await expect(getEventContext()).rejects.toThrow();
  });
});
