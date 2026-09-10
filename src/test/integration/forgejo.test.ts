// Integration tests for the Forgejo client (src/forgejo/index.ts) against a
// real Forgejo instance provisioned by src/test/integration/setup.ts.
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
  getPr,
  getRepository,
  patchIssue,
  postIssue,
  postIssueComment,
  postPrReview,
  postPr,
} from "../../forgejo/index.ts";
import { apiCtx, BASE_BRANCH, FORGEJO_USERNAME, INLINE_POSITION, SEED_REPOSITORY } from "./shared.ts";
import { forgejoFetch } from "../../forgejo/fetch.ts";
import Type from "typebox";
import { createTestPr } from "../utils.ts";

describe("Forgejo client against a real instance", () => {
  describe("repositories", () => {
    it("fetches the provisioned repository", async () => {
      const repository = await getRepository(apiCtx, SEED_REPOSITORY);
      expect(repository.full_name).toBe(SEED_REPOSITORY);
      expect(repository.default_branch).toBe(BASE_BRANCH);
    });

    it("throws on a missing repository", async () => {
      await expect(getRepository(apiCtx, "missing/repo")).rejects.toThrow();
    });
  });

  describe("issues", () => {
    it("fetches the seeded issue and its comments", async () => {
      const issue = await getIssue(apiCtx, SEED_REPOSITORY, 1);
      expect(issue.number).toBe(1);
      expect(issue.title).toBe("Integration test issue");
      expect(issue.user.username).toBe(FORGEJO_USERNAME);
      expect(issue.state).toBe("open");

      const comments = await getIssueComments(apiCtx, SEED_REPOSITORY, 1);
      expect(comments.some((c) => c.body === "integration seed comment")).toBe(true);
    });

    it("creates a comment and reads it back", async () => {
      const body = `integration comment ${Date.now()}`;
      const comment = await postIssueComment(apiCtx, SEED_REPOSITORY, 1, { body });
      expect(comment.body).toBe(body);

      const comments = await getIssueComments(apiCtx, SEED_REPOSITORY, 1);
      expect(comments.some((c) => c.body === body)).toBe(true);
    });

    it("creates an issue and reads it back", async () => {
      const title = `integration issue ${Date.now()}`;
      const issue = await postIssue(apiCtx, SEED_REPOSITORY, { title, body: "created by the client" });
      expect(issue.title).toBe(title);

      const fetched = await getIssue(apiCtx, SEED_REPOSITORY, issue.number);
      expect(fetched.number).toBe(issue.number);
      expect(fetched.title).toBe(title);
    });

    it("closes an issue with patchIssue", async () => {
      const issue = await postIssue(apiCtx, SEED_REPOSITORY, { title: `close me ${Date.now()}`, body: "" });
      const closed = await patchIssue(apiCtx, SEED_REPOSITORY, issue.number, { state: "closed" });
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
      await forgejoFetch(apiCtx, `/repos/${SEED_REPOSITORY}/branches`, Type.Object({}), {
        method: "POST",
        body: JSON.stringify({ new_branch_name: head, old_branch_name: BASE_BRANCH }),
      });

      const pr = await postPr(apiCtx, SEED_REPOSITORY, {
        title,
        body: "created by the client",
        head,
        base: BASE_BRANCH,
      });
      expect(pr.number).toBeGreaterThan(0);
      expect(pr.head.label).toBe(head);
      expect(pr.base.label).toBe(BASE_BRANCH);

      const fetched = await getPr(apiCtx, SEED_REPOSITORY, pr.number);
      expect(fetched.number).toBe(pr.number);
      expect(fetched.title).toBe(title);
    });

    it("submits a review and reads it back", async () => {
      const { pr, branch } = await createTestPr(apiCtx, SEED_REPOSITORY, `review target ${Date.now()}`);

      const review = await postPrReview(apiCtx, SEED_REPOSITORY, pr.number, {
        body: "looks good",
        event: "COMMENT",
        commit_id: branch.commit.id,
        comments: [],
      });
      expect(review.id).toBeGreaterThan(0);
      expect(review.body).toBe("looks good");

      const reviews = await getPrReviews(apiCtx, SEED_REPOSITORY, pr.number);
      expect(reviews.some((r) => r.id === review.id)).toBe(true);

      const single = await getPrReview(apiCtx, SEED_REPOSITORY, pr.number, review.id);
      expect(single.id).toBe(review.id);
      expect(single.body).toBe("looks good");

      const comments = await getPrReviewComments(apiCtx, SEED_REPOSITORY, pr.number, review.id);
      expect(comments).toEqual([]);
    });

    it("submits a review with an inline comment", async () => {
      const { pr, branch } = await createTestPr(apiCtx, SEED_REPOSITORY, `inline review ${Date.now()}`);
      const body = `inline ${Date.now()}`;

      const review = await postPrReview(apiCtx, SEED_REPOSITORY, pr.number, {
        body: "with an inline comment",
        event: "COMMENT",
        commit_id: branch.commit.id,
        comments: [{ body, path: "README.md", new_position: INLINE_POSITION, old_position: 0 }],
      });

      const comments = await getPrReviewComments(apiCtx, SEED_REPOSITORY, pr.number, review.id);
      expect(comments.some((c) => c.body === body)).toBe(true);
    });
  });
});
