import Type from "typebox";

export const authTokenSchema = Type.String({ minLength: 1 });
export const authUsernameSchema = Type.String({ minLength: 1 });

export const repositoryFullNameSchema = Type.String({
  pattern: /.+\/.+/,
  description: "Repository reference in owner/name format",
});

export const repositorySchema = Type.Object({
  full_name: repositoryFullNameSchema,
  default_branch: Type.String(),
});

export const eventNameSchema = Type.Union([
  Type.Literal("issue_comment_created"),
  Type.Literal("issues_opened"),
  Type.Literal("pull_request_opened"),
  Type.Literal("pull_request_review_requested"),
]);

export const issueNumberSchema = Type.String({
  pattern: /[0-9]+/,
  description: "Number assigned to the Forgejo issue",
});

const issueUserSchema = Type.Object({
  username: Type.String(),
});

export const issueSchema = Type.Object({
  number: Type.Number(),
  user: issueUserSchema,
  title: Type.String(),
  body: Type.String(),
  state: Type.Union([Type.Literal("open"), Type.Literal("closed")]),
  pull_request: Type.Union([Type.Object({}), Type.Null()]),
});

export const issueCommentSchema = Type.Object({
  user: issueUserSchema,
  body: Type.String(),
  id: Type.Number(),
});

const branchSchema = Type.Object({
  label: Type.String(),
});

export const pullRequestSchema = Type.Object({
  number: Type.Number(),
  user: issueUserSchema,
  title: Type.String(),
  body: Type.String(),
  state: Type.Union([Type.Literal("open"), Type.Literal("closed")]),
  head: branchSchema,
  base: branchSchema,
});

export const postReviewRequestSchema = Type.Object({
  number: Type.Number(),
});
