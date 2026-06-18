import Value from "typebox/value";
import { apiUrlSchema, authTokenSchema, authUsernameSchema, issueNumberSchema, repositorySchema } from "./schemas.ts";
import Type from "typebox";
import process from "node:process";

export const apiUrl = Value.Parse(apiUrlSchema, process.env.FORGEJO_API_URL);
export const repository = Value.Parse(repositorySchema, process.env.FORGEJO_REPOSITORY);

// FULL_EVENT_NAME is defined in action.yaml where we can access forge.event.action.
export const eventName = Value.Parse(Type.String(), process.env.CTX_EVENT_NAME);

// Head and base refs are defined only in pull requests.
export const headRef = Value.Parse(Type.Optional(Type.String()), process.env.FORGEJO_HEAD_REF);
export const baseRef = Value.Parse(Type.Optional(Type.String()), process.env.FORGEJO_BASE_REF);
export const refName = Value.Parse(Type.String(), process.env.FORGEJO_REF_NAME);

// Helpful to know if event was triggered from a PR or a issue.
export const eventLocation: "issue" | "pull request" = (() => {
  if (
    eventName === "pull_request_review_requested" ||
    eventName === "pull_request_opened" ||
    (eventName === "issue_comment_created" && headRef && baseRef)
  ) {
    return "pull request";
  }

  return "issue";
})();

export const issueNumber = Number.parseInt(Value.Parse(issueNumberSchema, process.env.CTX_ISSUE_NUMBER), 10);

export const authToken = Value.Parse(authTokenSchema, process.env.CTX_AUTH_TOKEN);
export const authUsername = Value.Parse(authUsernameSchema, process.env.CTX_AUTH_USERNAME);
