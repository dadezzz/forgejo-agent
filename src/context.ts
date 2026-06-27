import Value from "typebox/value";
import * as schema from "./schemas.ts";
import process from "node:process";
import { getIssue, getIssueComments, getPullRequest, getRepository } from "./forgejo/index.ts";
import Type from "typebox";

export function getAuthContext() {
  return {
    token: Value.Parse(schema.authTokenSchema, process.env.CTX_AUTH_TOKEN),
    username: Value.Parse(schema.authUsernameSchema, process.env.CTX_AUTH_USERNAME),
  };
}

export async function getEventContext() {
  const repositoryName = Value.Parse(schema.repositoryFullNameSchema, process.env.FORGEJO_REPOSITORY);
  const issueNumber = Number(Value.Parse(Type.String(), process.env.CTX_ISSUE_NUMBER));

  const issue = await getIssue(repositoryName, issueNumber);

  let pullRequest = null;
  if (issue.pull_request) {
    pullRequest = await getPullRequest(repositoryName, issueNumber);
  }

  const event = {
    ...(pullRequest ? { type: "pull request" as const, ...pullRequest } : { type: "issue" as const, ...issue }),
    name: Value.Parse(schema.eventNameSchema, process.env.CTX_EVENT_NAME),
    comments: await getIssueComments(repositoryName, issueNumber),
  };

  return {
    repository: await getRepository(repositoryName),
    event,
  };
}
