import { defineTool } from "@earendil-works/pi-coding-agent";
import Type from "typebox";
import { patchIssue, postIssue, postIssueComment } from "./forgejo.ts";
import * as schemas from "./schemas.ts";

export const closeIssue = defineTool({
  label: "close-issue",
  name: "close-issue",
  description: "Closes an issue in a Forgejo repository",
  parameters: Type.Object({
    repository: schemas.repositorySchema,
    issueNumber: schemas.issueNumberSchema,
  }),
  execute: async (_toolCallId, params) => {
    await patchIssue(params.repository, Number.parseInt(params.issueNumber, 10), { state: "closed" });
    return { content: [{ type: "text", text: "ok" }], details: null };
  },
});

export const createIssue = defineTool({
  label: "create-issue",
  name: "create-issue",
  description: "Creates an issue or pull request in a Forgejo repository",
  parameters: Type.Object({
    repository: schemas.repositorySchema,
    issueNumber: schemas.issueNumberSchema,
    title: Type.String(),
    body: Type.String(),
  }),
  execute: async (_toolCallId, params) => {
    await postIssue(params.repository, { title: params.title, body: params.body });
    return { content: [{ type: "text", text: "ok" }], details: null };
  },
});

export const createIssueComment = defineTool({
  label: "create-issue-comment",
  name: "create-issue-comment",
  description: "Creates a comment in an issue or pull request in a Forgejo repository",
  parameters: Type.Object({
    repository: schemas.repositorySchema,
    issueNumber: schemas.issueNumberSchema,
    body: Type.String(),
  }),
  execute: async (_toolCallId, params) => {
    await postIssueComment(params.repository, Number.parseInt(params.issueNumber, 10), { body: params.body });
    return { content: [{ type: "text", text: "ok" }], details: null };
  },
});
