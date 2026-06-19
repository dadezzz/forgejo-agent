import { defineTool } from "@earendil-works/pi-coding-agent";
import Type from "typebox";
import { patchIssue, postIssue, postIssueComment, postPullRequest } from "./forgejo.ts";
import * as schemas from "./schemas.ts";

export const closeIssue = defineTool({
  label: "close-issue",
  name: "close-issue",
  description: "Closes an issue in a Forgejo repository.",
  parameters: Type.Object({
    repository: schemas.repositorySchema,
    issueNumber: schemas.issueNumberSchema,
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
    repository: schemas.repositorySchema,
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
    repository: schemas.repositorySchema,
    issueNumber: schemas.issueNumberSchema,
    body: Type.String({ description: "Body of the comment" }),
  }),
  execute: async (_toolCallId, params) => {
    const comment = await postIssueComment(params.repository, Number(params.issueNumber), { body: params.body });
    return { content: [{ type: "text", text: `ok, created comment ${comment.id}` }], details: null };
  },
});

export const createPullRequest = defineTool({
  label: "create-pull-request",
  name: "create-pull-request",
  description: "Creates a pull request in a Forgejo repository.",
  parameters: Type.Object({
    repository: schemas.repositorySchema,
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
