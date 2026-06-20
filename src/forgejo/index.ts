import Type from "typebox";
import { issueCommentSchema, issueSchema, pullRequestSchema, repositorySchema } from "../schemas.ts";
import { forgejoFetch } from "./fetch.ts";

export async function getRepository(repositoryName: string) {
  return await forgejoFetch("GET", `/repos/${repositoryName}`, null, repositorySchema);
}

export async function getIssue(repositoryName: string, issueNumber: number) {
  return await forgejoFetch("GET", `/repos/${repositoryName}/issues/${issueNumber}`, null, issueSchema);
}

export async function patchIssue(
  repositoryName: string,
  issueNumber: number,
  patch: { body?: string; title?: string; state?: "open" | "closed" },
) {
  return await forgejoFetch(
    "PATCH",
    `/repos/${repositoryName}/issues/${issueNumber}`,
    JSON.stringify(patch),
    issueSchema,
  );
}

export async function postIssue(repositoryName: string, body: { body: string; title: string }) {
  return await forgejoFetch("POST", `/repos/${repositoryName}/issues`, JSON.stringify(body), issueSchema);
}

export async function getIssueComments(repositoryName: string, issueNumber: number) {
  return await forgejoFetch(
    "GET",
    `/repos/${repositoryName}/issues/${issueNumber}/comments`,
    null,
    Type.Array(issueCommentSchema),
  );
}

export async function postIssueComment(repositoryName: string, issueNumber: number, body: { body: string }) {
  return await forgejoFetch(
    "POST",
    `/repos/${repositoryName}/issues/${issueNumber}/comments`,
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

export async function getPullRequest(repositoryName: string, prNumber: number) {
  return await forgejoFetch("GET", `/repos/${repositoryName}/pulls/${prNumber}`, null, pullRequestSchema);
}
