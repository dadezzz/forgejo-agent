// Integration tests for getEventContext (src/context.ts) against a real
// Forgejo instance: repository + issue/PR + comments are all fetched live
// through the client, exercising the full context assembly path.

import { afterEach, describe, expect, it, vi } from "vitest";
import { getEventContext } from "../../context.ts";
import { apiCtx, SEED_REPOSITORY, SEED_ISSUE_NUMBER, FORGEJO_USERNAME, HEAD_BRANCH, BASE_BRANCH } from "./shared.ts";
import { postPr } from "../../forgejo/index.ts";

describe("getEventContext against a real instance", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds an issue event context from the seeded issue", async () => {
    vi.stubEnv("FORGEJO_REPOSITORY", SEED_REPOSITORY);
    vi.stubEnv("CTX_ISSUE_NUMBER", SEED_ISSUE_NUMBER.toString());
    vi.stubEnv("CTX_EVENT_NAME", "issues_opened");

    const ctx = await getEventContext(apiCtx);

    expect(ctx.repository.full_name).toBe(SEED_REPOSITORY);
    expect(ctx.repository.default_branch).toBe(BASE_BRANCH);
    expect(ctx.event.type).toBe("issue");
    if (ctx.event.type === "issue") {
      expect(ctx.event.number).toBe(SEED_ISSUE_NUMBER);
      expect(ctx.event.name).toBe("issues_opened");
      expect(ctx.event.user.username).toBe(FORGEJO_USERNAME);
      expect(ctx.event.title).toBe("Integration test issue");
      expect(ctx.event.comments.length).toBeGreaterThan(0);
    }
  });

  it("builds a pull request event context", async () => {
    const pr = await postPr(apiCtx, SEED_REPOSITORY, {
      title: `context pr ${Date.now()}`,
      body: "",
      base: BASE_BRANCH,
      head: HEAD_BRANCH,
    });
    vi.stubEnv("FORGEJO_REPOSITORY", SEED_REPOSITORY);
    vi.stubEnv("CTX_ISSUE_NUMBER", String(pr.number));
    vi.stubEnv("CTX_EVENT_NAME", "pull_request_review_requested");

    const ctx = await getEventContext(apiCtx);

    expect(ctx.event.type).toBe("pull request");
    if (ctx.event.type === "pull request") {
      expect(ctx.event.number).toBe(pr.number);
      expect(ctx.event.name).toBe("pull_request_review_requested");
      expect(ctx.event.head.label).toBe(HEAD_BRANCH);
      expect(ctx.event.base.label).toBe(BASE_BRANCH);
      expect(ctx.event.state).toBe("open");
    }
  });
});
