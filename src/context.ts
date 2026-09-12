import Value from "typebox/value";
import * as schema from "./schemas.ts";
import process from "node:process";
import { getIssue, getIssueComments, getPr, getPrReviewsWithComments, getRepository } from "./forgejo/index.ts";
import Type from "typebox";

export class ApiContext {
  url: URL;
  auth: { basic: true; password: string; username: string } | { basic: false; token: string; username: string };

  constructor(url: typeof this.url, auth: typeof this.auth) {
    this.url = url;
    this.auth = auth;
  }

  static fromEnv(): ApiContext {
    const url = new URL(Value.Parse(schema.apiUrlSchema, process.env.FORGEJO_API_URL));
    const token = Value.Parse(schema.authTokenSchema, process.env.CTX_AUTH_TOKEN);
    const username = Value.Parse(schema.authUsernameSchema, process.env.CTX_AUTH_USERNAME);

    return new ApiContext(url, { basic: false, username, token });
  }

  getAuthHttpHeader(): string {
    if (this.auth.basic) {
      return `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString("base64")}`;
    } else {
      return `Token ${this.auth.token}`;
    }
  }

  getAuthRepoUrl(repo: string): string {
    const url = new URL(this.url);

    url.username = this.auth.username;
    url.password = this.auth.basic ? this.auth.password : this.auth.token;
    url.pathname = `${repo}.git`;

    return url.toString();
  }
}

export async function getEventContext(apiCtx: ApiContext) {
  const repositoryName = Value.Parse(schema.repositoryFullNameSchema, process.env.FORGEJO_REPOSITORY);
  const issueNumber = Number(Value.Parse(Type.String(), process.env.CTX_ISSUE_NUMBER));

  const issue = await getIssue(apiCtx, repositoryName, issueNumber);

  let pullRequest = null;
  if (issue.pull_request) {
    pullRequest = await getPr(apiCtx, repositoryName, issueNumber);
  }

  const eventName = Value.Parse(schema.eventNameSchema, process.env.CTX_EVENT_NAME);

  let reviews = null;
  if (eventName === "pull_request_review_requested" && pullRequest) {
    reviews = await getPrReviewsWithComments(apiCtx, repositoryName, issueNumber);
  }

  const event = {
    ...(pullRequest ? { type: "pull request" as const, ...pullRequest } : { type: "issue" as const, ...issue }),
    name: eventName,
    comments: await getIssueComments(apiCtx, repositoryName, issueNumber),
    reviews,
  };

  return {
    repository: await getRepository(apiCtx, repositoryName),
    event,
  };
}

export type EventContext = Awaited<ReturnType<typeof getEventContext>>;
