import Type, { type StaticParse } from "typebox";
import {
  issueCommentSchema,
  issueSchema,
  prReviewCommentSchema,
  type prReviewEventSchema,
  prReviewSchema,
  pullRequestSchema,
  repositorySchema,
} from "../schemas.ts";
import { forgejoFetch } from "./fetch.ts";

export async function getRepository(repositoryName: string) {
  return await forgejoFetch("GET", `/repos/${repositoryName}`, null, repositorySchema);
}

export async function getIssue(repositoryName: string, issueId: number) {
  return await forgejoFetch("GET", `/repos/${repositoryName}/issues/${issueId}`, null, issueSchema);
}

export async function patchIssue(
  repositoryName: string,
  issueId: number,
  patch: { body?: string; title?: string; state?: "open" | "closed" },
) {
  return await forgejoFetch("PATCH", `/repos/${repositoryName}/issues/${issueId}`, JSON.stringify(patch), issueSchema);
}

export async function postIssue(repositoryName: string, body: { body: string; title: string }) {
  return await forgejoFetch("POST", `/repos/${repositoryName}/issues`, JSON.stringify(body), issueSchema);
}

export async function getIssueComments(repositoryName: string, issueId: number) {
  return await forgejoFetch(
    "GET",
    `/repos/${repositoryName}/issues/${issueId}/comments`,
    null,
    Type.Array(issueCommentSchema),
  );
}

export async function postIssueComment(repositoryName: string, issueId: number, body: { body: string }) {
  return await forgejoFetch(
    "POST",
    `/repos/${repositoryName}/issues/${issueId}/comments`,
    JSON.stringify(body),
    issueCommentSchema,
  );
}

export async function postPullRequest(
  repositoryName: string,
  body: { title: string; body: string; head: string; base: string },
) {
  return await forgejoFetch("POST", `/repos/${repositoryName}/pulls`, JSON.stringify(body), pullRequestSchema);
}

export async function getPullRequest(repositoryName: string, prId: number) {
  return await forgejoFetch("GET", `/repos/${repositoryName}/pulls/${prId}`, null, pullRequestSchema);
}

export async function getPrReviews(repositoryName: string, prId: number) {
  return await forgejoFetch("GET", `/repos/${repositoryName}/pulls/${prId}/reviews`, null, Type.Array(prReviewSchema));
}

export async function getPrReview(repositoryName: string, prId: number, reviewId: number) {
  return await forgejoFetch("GET", `/repos/${repositoryName}/pulls/${prId}/reviews/${reviewId}`, null, prReviewSchema);
}

export async function getPrReviewComments(repositoryName: string, prId: number, reviewId: number) {
  return await forgejoFetch(
    "GET",
    `/repos/${repositoryName}/pulls/${prId}/reviews/${reviewId}/comments`,
    null,
    Type.Array(prReviewCommentSchema),
  );
}

interface PrReviewNewComment {
  body: string;
  old_position: number;
  new_position: number;
  path: string;
}

export async function postPrReview(
  repositoryName: string,
  prId: number,
  body: {
    body: string;
    commit_id: string;
    event: StaticParse<typeof prReviewEventSchema>;
    comments: PrReviewNewComment[];
  },
) {
  return await forgejoFetch(
    "POST",
    `/repos/${repositoryName}/pulls/${prId}/reviews`,
    JSON.stringify(body),
    prReviewSchema,
  );
}

export async function postPrReviewComment(
  repositoryName: string,
  prId: number,
  reviewId: number,
  body: PrReviewNewComment,
) {
  return await forgejoFetch(
    "POST",
    `/repos/${repositoryName}/pulls/${prId}/reviews/${reviewId}/comments`,
    JSON.stringify(body),
    prReviewCommentSchema,
  );
}
