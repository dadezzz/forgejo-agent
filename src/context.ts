import Value from "typebox/value";
import {
  authTokenSchema,
  authUsernameSchema,
  eventNameSchema,
  issueIdSchema,
  repositoryFullNameSchema,
} from "./schemas.ts";
import process from "node:process";
import { getIssue, getIssueComments, getPullRequest, getRepository } from "./forgejo/index.ts";

export function getAuthContext() {
  return {
    token: Value.Parse(authTokenSchema, process.env.CTX_AUTH_TOKEN),
    username: Value.Parse(authUsernameSchema, process.env.CTX_AUTH_USERNAME),
  };
}

export async function getEventContext() {
  const repositoryName = Value.Parse(repositoryFullNameSchema, process.env.FORGEJO_REPOSITORY);
  const issueNumber = Number(Value.Parse(issueIdSchema, process.env.CTX_ISSUE_NUMBER));

  const issue = await getIssue(repositoryName, issueNumber);

  let pullRequest = null;
  if (issue.pull_request) {
    pullRequest = await getPullRequest(repositoryName, issueNumber);
  }

  const event = {
    ...(pullRequest ? { type: "pull request" as const, ...pullRequest } : { type: "issue" as const, ...issue }),
    name: Value.Parse(eventNameSchema, process.env.CTX_EVENT_NAME),
    comments: await getIssueComments(repositoryName, issueNumber),
  };

  return {
    repository: await getRepository(repositoryName),
    event,
  };
}
