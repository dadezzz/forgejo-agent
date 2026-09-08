// Integration tests for getEventContext (src/context.ts) against a real
// Forgejo instance: repository + issue/PR + comments are all fetched live
// through the client, exercising the full context assembly path.
import { afterEach, describe, expect, it, vi } from "vitest";
import { getEventContext } from "../../src/context.ts";
import { createPullRequest, credentials } from "./helpers.ts";

describe("getEventContext against a real instance", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds an issue event context from the seeded issue", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", credentials.repository);
    vi.stubEnv("CTX_ISSUE_NUMBER", String(credentials.seedIssueNumber));
    vi.stubEnv("CTX_EVENT_NAME", "issues_opened");

    const ctx = await getEventContext();

    expect(ctx.repository.full_name).toBe(credentials.repository);
    expect(ctx.repository.default_branch).toBe(credentials.baseBranch);
    expect(ctx.event.type).toBe("issue");
    if (ctx.event.type === "issue") {
      expect(ctx.event.number).toBe(credentials.seedIssueNumber);
      expect(ctx.event.name).toBe("issues_opened");
      expect(ctx.event.user.username).toBe(credentials.adminUsername);
      expect(ctx.event.title).toBe("Integration test issue");
      expect(ctx.event.comments.length).toBeGreaterThan(0);
    }
  });

  it("builds a pull request event context", async () => {
    const pr = await createPullRequest(`context pr ${Date.now()}`);
    vi.stubEnv("FORGEJO_REPOSITORY", credentials.repository);
    vi.stubEnv("CTX_ISSUE_NUMBER", String(pr.number));
    vi.stubEnv("CTX_EVENT_NAME", "pull_request_review_requested");

    const ctx = await getEventContext();

    expect(ctx.event.type).toBe("pull request");
    if (ctx.event.type === "pull request") {
      expect(ctx.event.number).toBe(pr.number);
      expect(ctx.event.name).toBe("pull_request_review_requested");
      expect(ctx.event.head.label).toBe(pr.head.label);
      expect(ctx.event.base.label).toBe(credentials.baseBranch);
      expect(ctx.event.state).toBe("open");
    }
  });
});
