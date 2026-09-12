import Type, { type StaticParse } from "typebox";
import * as schemas from "../schemas.ts";
import { forgejoFetch } from "./fetch.ts";
import type { ApiContext } from "../context.ts";

export async function getRepository(apiCtx: ApiContext, repo: string) {
  return await forgejoFetch(apiCtx, `/repos/${repo}`, schemas.repositorySchema, {});
}

export async function getIssue(apiCtx: ApiContext, repo: string, issueId: number) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/issues/${issueId}`, schemas.issueSchema, {});
}

interface SearchIssuesParams {
  query?: string;
  state?: "open" | "closed";
  limit?: number;
  page?: number;
}

export async function searchIssues(apiCtx: ApiContext, repo: string, params: SearchIssuesParams) {
  const urlParams = new URLSearchParams({
    q: params.query ?? "",
    type: "issues",
    state: params.state ?? "",
    limit: params.limit?.toString() ?? "",
    page: params.page?.toString() ?? "",
  });

  return await forgejoFetch(
    apiCtx,
    `/repos/${repo}/issues?${urlParams.toString()}`,
    Type.Array(schemas.issueSchema),
    {},
  );
}

interface PatchIssueBody {
  body?: string;
  title?: string;
  state?: "open" | "closed";
}

export async function patchIssue(apiCtx: ApiContext, repo: string, issueId: number, patch: PatchIssueBody) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/issues/${issueId}`, schemas.issueSchema, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

interface PostIssueBody {
  body: string;
  title: string;
}

export async function postIssue(apiCtx: ApiContext, repo: string, body: PostIssueBody) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/issues`, schemas.issueSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getIssueComments(apiCtx: ApiContext, repo: string, issueId: number) {
  return await forgejoFetch(
    apiCtx,
    `/repos/${repo}/issues/${issueId}/comments`,
    Type.Array(schemas.issueCommentSchema),
    {},
  );
}

interface PostIssueCommentBody {
  body: string;
}

export async function postIssueComment(apiCtx: ApiContext, repo: string, issueId: number, body: PostIssueCommentBody) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/issues/${issueId}/comments`, schemas.issueCommentSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

interface PostPrBody {
  title: string;
  body: string;
  head: string;
  base: string;
}

export async function postPr(apiCtx: ApiContext, repo: string, body: PostPrBody) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/pulls`, schemas.pullRequestSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getPr(apiCtx: ApiContext, repo: string, prId: number) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/pulls/${prId}`, schemas.pullRequestSchema, {});
}

export async function searchPrs(apiCtx: ApiContext, repo: string, params: SearchIssuesParams) {
  const urlParams = new URLSearchParams({
    q: params.query ?? "",
    type: "pulls",
    state: params.state ?? "",
    limit: params.limit?.toString() ?? "",
    page: params.page?.toString() ?? "",
  });

  // The pull request search endpoint returns pull requests as issue-shaped
  // payloads (no head/base), so fetch each pull request individually.
  const issues = await forgejoFetch(
    apiCtx,
    `/repos/${repo}/issues?${urlParams.toString()}`,
    Type.Array(schemas.issueSchema),
    {},
  );
  return Promise.all(issues.map((i) => getPr(apiCtx, repo, i.number)));
}

export async function getPrReviews(apiCtx: ApiContext, repo: string, prId: number) {
  const reviews = await forgejoFetch(
    apiCtx,
    `/repos/${repo}/pulls/${prId}/reviews`,
    Type.Array(schemas.prReviewSchema),
    {},
  );

  // Pending reviews are drafts that haven't been submitted yet, so they carry
  // no verdict and add no value to the review history.
  return reviews.filter((review) => review.state !== "PENDING");
}

export async function getPrReview(apiCtx: ApiContext, repo: string, prId: number, reviewId: number) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/pulls/${prId}/reviews/${reviewId}`, schemas.prReviewSchema, {});
}

export async function getPrReviewComments(apiCtx: ApiContext, repo: string, prId: number, reviewId: number) {
  return await forgejoFetch(
    apiCtx,
    `/repos/${repo}/pulls/${prId}/reviews/${reviewId}/comments`,
    Type.Array(schemas.prReviewCommentSchema),
    {},
  );
}

export async function getPrReviewsWithComments(apiCtx: ApiContext, repo: string, prId: number) {
  const reviews = await getPrReviews(apiCtx, repo, prId);

  return await Promise.all(
    reviews.map(async (review) => ({
      ...review,
      comments: await getPrReviewComments(apiCtx, repo, prId, review.id),
    })),
  );
}

interface PostPrReviewCommentBody {
  body: string;
  old_position: number;
  new_position: number;
  path: string;
}

interface PostPrReviewBody {
  body: string;
  commit_id: string;
  event: StaticParse<typeof schemas.prReviewEventSchema>;
  comments: PostPrReviewCommentBody[];
}

export async function postPrReview(apiCtx: ApiContext, repo: string, prId: number, body: PostPrReviewBody) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/pulls/${prId}/reviews`, schemas.prReviewSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postPrReviewComment(
  apiCtx: ApiContext,
  repo: string,
  prId: number,
  reviewId: number,
  body: PostPrReviewCommentBody,
) {
  return await forgejoFetch(
    apiCtx,
    `/repos/${repo}/pulls/${prId}/reviews/${reviewId}/comments`,
    schemas.prReviewCommentSchema,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function createBranch(apiCtx: ApiContext, repo: string, base: string, head: string) {
  return await forgejoFetch(apiCtx, `/repos/${repo}/branches`, schemas.branchSchema, {
    method: "POST",
    body: JSON.stringify({ new_branch_name: head, old_branch_name: base }),
  });
}
