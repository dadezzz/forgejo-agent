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

export const issueIdSchema = Type.Number({
  description: "Number used to identify the Forgejo issue",
});

const issueUserSchema = Type.Object({
  username: Type.String(),
});

const issueStateSchema = Type.Union([Type.Literal("open"), "closed"]);

export const issueSchema = Type.Object({
  number: Type.Number(),
  user: issueUserSchema,
  title: Type.String(),
  body: Type.String(),
  state: issueStateSchema,
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
  state: issueStateSchema,
  head: branchSchema,
  base: branchSchema,
});

export const commitIdSchema = Type.String({ description: "Commit SHA" });

export const prReviewIdSchema = Type.Number({
  description: "Number used to identify the review",
});

export const prReviewEventSchema = Type.Union(
  [Type.Literal("APPROVE"), Type.Literal("REQUEST_CHANGES"), Type.Literal("COMMENT")],
  { description: "Resolution type of the review" },
);

export const prReviewCommentSchema = Type.Object({
  body: Type.String(),
});

export const prReviewSchema = Type.Object({
  id: prReviewIdSchema,
  body: Type.String(),
});
