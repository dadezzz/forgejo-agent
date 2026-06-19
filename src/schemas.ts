import Type from "typebox";

export const apiUrlSchema = Type.String({ pattern: /https?:\/\/.+/ });

export const authTokenSchema = Type.String({ minLength: 1 });
export const authUsernameSchema = Type.String({ minLength: 1 });

export const repositorySchema = Type.String({
  pattern: /.+\/.+/,
  description: "Repository reference in owner/name format",
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

export const issueSchema = Type.Object({
  number: Type.Number(),
  user: Type.Object({
    username: Type.String(),
  }),
  title: Type.String(),
  body: Type.String(),
  state: Type.Union([Type.Literal("open"), Type.Literal("closed")]),
});

export const issueCommentSchema = Type.Object({
  user: Type.Object({
    username: Type.String(),
  }),
  body: Type.String(),
  id: Type.Number(),
});

export const pullRequestSchema = issueSchema;

export const postReviewRequestSchema = Type.Object({
  number: Type.Number(),
});
