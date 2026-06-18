import Value from "typebox/value";
import { apiUrlSchema, authTokenSchema, authUsernameSchema, issueNumberSchema, repositorySchema } from "./schemas.ts";

export const apiUrl = Value.Parse(apiUrlSchema, process.env.FORGEJO_API_URL);
export const repository = Value.Parse(repositorySchema, process.env.FORGEJO_REPOSITORY);

export const issueNumber = Number.parseInt(Value.Parse(issueNumberSchema, process.env.INPUT_ISSUE_NUMBER), 10);

export const authToken = Value.Parse(authTokenSchema, process.env.INPUT_AUTH_TOKEN);
export const authUsername = Value.Parse(authUsernameSchema, process.env.INPUT_AUTH_USERNAME);
