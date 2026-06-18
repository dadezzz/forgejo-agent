import Type from "typebox";

export const apiUrlSchema = Type.String();

export const authTokenSchema = Type.String();

export const authUsernameSchema = Type.String();

export const repositorySchema = Type.String({
  pattern: /.+\/.+/,
  description: "Repository reference in owner/name format",
});

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
  state: Type.String({ pattern: /open|closed/ }),
});

export const issueCommentSchema = Type.Object({
  user: Type.Object({
    username: Type.String(),
  }),
  body: Type.String(),
});
