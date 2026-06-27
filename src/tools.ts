import { defineTool } from "@earendil-works/pi-coding-agent";
import Type from "typebox";
import { patchIssue, postIssue, postIssueComment, postPrReview, postPullRequest } from "./forgejo/index.ts";
import * as schemas from "./schemas.ts";

export const closeIssue = defineTool({
  label: "close-issue",
  name: "close-issue",
  description: "Closes an issue in a Forgejo repository.",
  parameters: Type.Object({
    repository: schemas.repositoryFullNameSchema,
    issueNumber: schemas.issueIdSchema,
  }),
  execute: async (_toolCallId, params) => {
    const issue = await patchIssue(params.repository, Number(params.issueNumber), { state: "closed" });
    return { content: [{ type: "text", text: `ok, closed issue ${issue.number}` }], details: null };
  },
});

export const createIssue = defineTool({
  label: "create-issue",
  name: "create-issue",
  description: "Creates an issue in a Forgejo repository.",
  parameters: Type.Object({
    repository: schemas.repositoryFullNameSchema,
    title: Type.String({ description: "Title of the issue" }),
    body: Type.String({ description: "Content body of the issue" }),
  }),
  execute: async (_toolCallId, params) => {
    const issue = await postIssue(params.repository, { title: params.title, body: params.body });
    return { content: [{ type: "text", text: `ok, created issue ${issue.number}` }], details: null };
  },
});

export const createIssueComment = defineTool({
  label: "create-issue-comment",
  name: "create-issue-comment",
  description: "Creates a comment in an issue or pull request in a Forgejo repository",
  parameters: Type.Object({
    repository: schemas.repositoryFullNameSchema,
    issueNumber: schemas.issueIdSchema,
    body: Type.String({ description: "Body of the comment" }),
  }),
  execute: async (_toolCallId, params) => {
    const comment = await postIssueComment(params.repository, Number(params.issueNumber), { body: params.body });
    return { content: [{ type: "text", text: `ok, created comment ${comment.id}` }], details: null };
  },
});

export const createPr = defineTool({
  label: "create-pr",
  name: "create-pr",
  description: "Creates a pull request in a Forgejo repository. Doesn't handle git operations",
  parameters: Type.Object({
    repository: schemas.repositoryFullNameSchema,
    title: Type.String({ description: "Title of the pull request" }),
    body: Type.String({ description: "Comment body of the pull request" }),
    head: Type.String({ description: "Name of the head branch" }),
    base: Type.String({ description: "Name of the base branch" }),
  }),
  execute: async (_toolCallId, params) => {
    const pr = await postPullRequest(params.repository, {
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    });

    return { content: [{ type: "text", text: `ok, created pull request ${pr.number}` }], details: null };
  },
});

export const createPrReview = defineTool({
  label: "create-pr-review",
  name: "create-pr-review",
  description: "Submits a review for a pull request",
  parameters: Type.Object({
    repository: schemas.repositoryFullNameSchema,
    prNumber: schemas.issueIdSchema,
    body: Type.String({ description: "Main comment body" }),
    comments: Type.Array(
      Type.Object({
        body: Type.String({ description: "Body of the comment" }),
        path: Type.String({ description: "Path in the workspace" }),
        line: Type.Integer({ description: "File line of the comment" }),
        side: Type.Union([Type.Literal("BASE"), Type.Literal("HEAD")], {
          description: "HEAD if the comment is on the updated file, BASE otherwise",
        }),
      }),
    ),
    commitId: schemas.commitIdSchema,
    event: schemas.prReviewEventSchema,
  }),
  execute: async (_toolCallId, params) => {
    const review = await postPrReview(params.repository, Number(params.prNumber), {
      body: params.body,
      comments: params.comments.map((c) => ({
        body: c.body,
        new_position: c.side === "HEAD" ? c.line : 0,
        old_position: c.side === "BASE" ? c.line : 0,
        path: c.path,
      })),
      commit_id: params.commitId,
      event: params.event,
    });

    return {
      content: [{ type: "text", text: `ok, created review ${review.id} for pull request ${params.prNumber}` }],
      details: null,
    };
  },
});
