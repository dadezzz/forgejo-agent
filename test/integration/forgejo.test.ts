// Integration tests for the Forgejo client (src/forgejo/index.ts) against a
// real Forgejo instance provisioned by scripts/integration-setup.sh.
//
// Every call goes through forgejoFetch, which validates the response against
// the TypeBox schemas, so a passing suite guarantees the schemas accept the
// payloads produced by the pinned Forgejo version — this is the "content is
// always synced" guarantee (examples/event_payloads are only a reference).
import { describe, expect, it } from "vitest";
import {
  getIssue,
  getIssueComments,
  getPrReview,
  getPrReviewComments,
  getPrReviews,
  getPullRequest,
  getRepository,
  patchIssue,
  postIssue,
  postIssueComment,
  postPrReview,
  postPullRequest,
} from "../../src/forgejo/index.ts";
import { api, createIssue, createPullRequest, credentials } from "./helpers.ts";

describe("Forgejo client against a real instance", () => {
  describe("repositories", () => {
    it("fetches the provisioned repository", async () => {
      const repository = await getRepository(credentials.repository);
      expect(repository.full_name).toBe(credentials.repository);
      expect(repository.default_branch).toBe(credentials.baseBranch);
    });

    it("throws on a missing repository", async () => {
      await expect(getRepository("missing/repo")).rejects.toThrow("fetch failed");
    });
  });

  describe("issues", () => {
    it("fetches the seeded issue and its comments", async () => {
      const issue = await getIssue(credentials.repository, credentials.seedIssueNumber);
      expect(issue.number).toBe(credentials.seedIssueNumber);
      expect(issue.title).toBe("Integration test issue");
      expect(issue.user.username).toBe(credentials.adminUsername);
      expect(issue.state).toBe("open");

      const comments = await getIssueComments(credentials.repository, credentials.seedIssueNumber);
      expect(comments.some((c) => c.body === "integration seed comment")).toBe(true);
    });

    it("creates a comment and reads it back", async () => {
      const body = `integration comment ${Date.now()}`;
      const comment = await postIssueComment(credentials.repository, credentials.seedIssueNumber, { body });
      expect(comment.body).toBe(body);

      const comments = await getIssueComments(credentials.repository, credentials.seedIssueNumber);
      expect(comments.some((c) => c.body === body)).toBe(true);
    });

    it("creates an issue and reads it back", async () => {
      const title = `integration issue ${Date.now()}`;
      const issue = await postIssue(credentials.repository, { title, body: "created by the client" });
      expect(issue.title).toBe(title);

      const fetched = await getIssue(credentials.repository, issue.number);
      expect(fetched.number).toBe(issue.number);
      expect(fetched.title).toBe(title);
    });

    it("closes an issue with patchIssue", async () => {
      const issue = await createIssue(`close me ${Date.now()}`, "body");
      const closed = await patchIssue(credentials.repository, issue.number, { state: "closed" });
      expect(closed.number).toBe(issue.number);
      expect(closed.state).toBe("closed");
    });
  });

  describe("pull requests", () => {
    it("creates a pull request and reads it back", async () => {
      const title = `integration pr ${Date.now()}`;
      // Forgejo only allows one open PR per head/base pair, so give this PR
      // its own branch (same diff as the provisioned change branch).
      const head = `client-pr-${Date.now()}`;
      await api(`/repos/${credentials.repository}/branches`, {
        method: "POST",
        body: JSON.stringify({ new_branch_name: head, old_branch_name: credentials.headBranch }),
      });

      const pr = await postPullRequest(credentials.repository, {
        title,
        body: "created by the client",
        head,
        base: credentials.baseBranch,
      });
      expect(pr.number).toBeGreaterThan(0);
      expect(pr.head.label).toBe(head);
      expect(pr.base.label).toBe(credentials.baseBranch);

      const fetched = await getPullRequest(credentials.repository, pr.number);
      expect(fetched.number).toBe(pr.number);
      expect(fetched.title).toBe(title);
    });

    it("submits a review and reads it back", async () => {
      const pr = await createPullRequest(`review target ${Date.now()}`);

      const review = await postPrReview(credentials.repository, pr.number, {
        body: "looks good",
        event: "COMMENT",
        commit_id: credentials.headSha,
        comments: [],
      });
      expect(review.id).toBeGreaterThan(0);
      expect(review.body).toBe("looks good");

      const reviews = await getPrReviews(credentials.repository, pr.number);
      expect(reviews.some((r) => r.id === review.id)).toBe(true);

      const single = await getPrReview(credentials.repository, pr.number, review.id);
      expect(single.id).toBe(review.id);
      expect(single.body).toBe("looks good");

      const comments = await getPrReviewComments(credentials.repository, pr.number, review.id);
      expect(comments).toEqual([]);
    });

    it("submits a review with an inline comment", async () => {
      const pr = await createPullRequest(`inline review ${Date.now()}`);
      const body = `inline ${Date.now()}`;

      const review = await postPrReview(credentials.repository, pr.number, {
        body: "with an inline comment",
        event: "COMMENT",
        commit_id: credentials.headSha,
        comments: [{ body, path: "README.md", new_position: credentials.inlinePosition, old_position: 0 }],
      });

      const comments = await getPrReviewComments(credentials.repository, pr.number, review.id);
      expect(comments.some((c) => c.body === body)).toBe(true);
    });
  });
});
