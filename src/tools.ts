import { defineTool } from "@earendil-works/pi-coding-agent";
import Type from "typebox";
import { patchIssue, postIssue } from "./forgejo.ts";
import * as schemas from "./schemas.ts";

export const closeIssue = defineTool({
  label: "close-issue",
  name: "close-issue",
  description: "Closes the specified Forgejo issue",
  parameters: Type.Object({
    repository: schemas.repositorySchema,
    issueNumber: schemas.issueNumberSchema,
  }),
  execute: async (_toolCallId, params) => {
    try {
      await patchIssue(params.repository, Number.parseInt(params.issueNumber, 10), { state: "closed" });
    } catch (e) {
      const error = e as Error;
      return { content: [{ type: "text", text: error.message }], details: null };
    }

    return { content: [{ type: "text", text: "ok" }], details: null };
  },
});

export const createIssue = defineTool({
  label: "create-issue",
  name: "create-issue",
  description: "Posts an issue to a Forgejo repository",
  parameters: Type.Object({
    repository: schemas.repositorySchema,
    issueNumber: schemas.issueNumberSchema,
    title: Type.String(),
    body: Type.String(),
  }),
  execute: async (_toolCallId, params) => {
    try {
      await postIssue(params.repository, { title: params.title, body: params.body });
    } catch (e) {
      const error = e as Error;
      return { content: [{ type: "text", text: error.message }], details: null };
    }

    return { content: [{ type: "text", text: "ok" }], details: null };
  },
});
