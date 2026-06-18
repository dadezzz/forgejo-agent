import Type, { type StaticParse, type TSchema } from "typebox";
import Value from "typebox/value";
import * as context from "./context.ts";
import { issueCommentSchema, issueSchema } from "./schemas.ts";

async function forgejoFetch<const S extends TSchema>(
  method: string,
  pathname: string,
  body: BodyInit | null,
  responseSchema: S,
): Promise<StaticParse<S>> {
  const headers = new Headers({
    accept: "application/json",
    authorization: `Bearer ${context.authToken}`,
  });

  if (body) {
    headers.append("content-type", "application/json");
  }

  const response = await fetch(context.apiUrl + pathname, { method, headers, body });
  if (response.status >= 400) {
    throw new Error(`fetch failed: ${await response.text()}`);
  }

  const responseBody = await response.json();
  return Value.Parse(responseSchema, responseBody);
}

export async function getIssue(repository: string, issueNumber: number) {
  return await forgejoFetch("GET", `/repos/${repository}/issues/${issueNumber}`, null, issueSchema);
}

export async function patchIssue(
  repository: string,
  issueNumber: number,
  patch: Partial<StaticParse<typeof issueSchema>>,
) {
  return await forgejoFetch("PATCH", `/repos/${repository}/issues/${issueNumber}`, JSON.stringify(patch), issueSchema);
}

export async function postIssue(repository: string, body: Partial<StaticParse<typeof issueSchema>>) {
  return await forgejoFetch("POST", `/repos/${repository}/issues`, JSON.stringify(body), issueSchema);
}

export async function getIssueComments(repository: string, issueNumber: number) {
  return await forgejoFetch(
    "GET",
    `/repos/${repository}/issues/${issueNumber}/comments`,
    null,
    Type.Array(issueCommentSchema),
  );
}

export async function postIssueComment(
  repository: string,
  issueNumber: number,
  body: Partial<StaticParse<typeof issueCommentSchema>>,
) {
  return await forgejoFetch(
    "POST",
    `/repos/${repository}/issues/${issueNumber}/comments`,
    JSON.stringify(body),
    issueCommentSchema,
  );
}
