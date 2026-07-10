import { defineTool } from "@earendil-works/pi-coding-agent";
import Type from "typebox";
import { getLatestCommitId } from "./git.ts";
import { patchIssue, postIssue, postIssueComment, postPrReview, postPullRequest } from "./forgejo/index.ts";
import * as schemas from "./schemas.ts";

export function createCloseIssueTool(defaultRepository: string, defaultIssueId: number) {
  return defineTool({
    label: "close-issue",
    name: "close-issue",
    description: "Closes an issue in a Forgejo repository.",
    parameters: Type.Object({
      repository: Type.Optional(schemas.repositoryFullNameSchema),
      issueId: Type.Optional(schemas.issueIdSchema),
    }),
    execute: async (_toolCallId, params) => {
      const repository = params.repository ?? defaultRepository;
      const issueId = params.issueId ?? defaultIssueId;
      const issue = await patchIssue(repository, Number(issueId), { state: "closed" });
      return { content: [{ type: "text", text: `ok, closed issue ${issue.number}` }], details: null };
    },
  });
}

export function createCreateIssueTool(defaultRepository: string) {
  return defineTool({
    label: "create-issue",
    name: "create-issue",
    description: "Creates an issue",
    parameters: Type.Object({
      repository: Type.Optional(schemas.repositoryFullNameSchema),
      title: Type.String({ description: "Title of the issue" }),
      body: Type.String({ description: "Content body of the issue" }),
    }),
    execute: async (_toolCallId, params) => {
      const repository = params.repository ?? defaultRepository;
      const issue = await postIssue(repository, { title: params.title, body: params.body });
      return { content: [{ type: "text", text: `ok, created issue ${issue.number}` }], details: null };
    },
  });
}

export function createCreateIssueCommentTool(defaultRepository: string, defaultIssueId: number) {
  return defineTool({
    label: "create-issue-comment",
    name: "create-issue-comment",
    description: "Creates a comment in an issue or pull request",
    parameters: Type.Object({
      repository: Type.Optional(schemas.repositoryFullNameSchema),
      issueId: Type.Optional(schemas.issueIdSchema),
      body: Type.String({ description: "Body of the comment" }),
    }),
    execute: async (_toolCallId, params) => {
      const repository = params.repository ?? defaultRepository;
      const issueId = params.issueId ?? defaultIssueId;
      const comment = await postIssueComment(repository, issueId, { body: params.body });
      return { content: [{ type: "text", text: `ok, created comment ${comment.id}` }], details: null };
    },
  });
}

export function createCreatePrTool(defaultRepository: string) {
  return defineTool({
    label: "create-pr",
    name: "create-pr",
    description: "Creates a pull request. Doesn't handle git operations",
    parameters: Type.Object({
      repository: Type.Optional(schemas.repositoryFullNameSchema),
      title: Type.String({ description: "Title of the pull request" }),
      body: Type.String({ description: "Comment body of the pull request" }),
      head: Type.String({ description: "Name of the head branch" }),
      base: Type.String({ description: "Name of the base branch" }),
    }),
    execute: async (_toolCallId, params) => {
      const repository = params.repository ?? defaultRepository;

      const pr = await postPullRequest(repository, {
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
      });

      return { content: [{ type: "text", text: `ok, created pull request ${pr.number}` }], details: null };
    },
  });
}

export function createCreatePrReviewTool(defaultRepository: string, defaultPrId: number) {
  return defineTool({
    label: "create-pr-review",
    name: "create-pr-review",
    description: "Submits a review for a pull request",
    parameters: Type.Object({
      repository: Type.Optional(schemas.repositoryFullNameSchema),
      prId: Type.Optional(schemas.issueIdSchema),
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
      event: schemas.prReviewEventSchema,
    }),
    execute: async (_toolCallId, params) => {
      const repository = params.repository ?? defaultRepository;
      const prId = params.prId ?? defaultPrId;

      const review = await postPrReview(repository, prId, {
        body: params.body,
        comments: params.comments.map((c) => ({
          body: c.body,
          new_position: c.side === "HEAD" ? c.line : 0,
          old_position: c.side === "BASE" ? c.line : 0,
          path: c.path,
        })),
        commit_id: getLatestCommitId(),
        event: params.event,
      });

      return {
        content: [{ type: "text", text: `ok, created review ${review.id} for pull request ${prId}` }],
        details: null,
      };
    },
  });
}
