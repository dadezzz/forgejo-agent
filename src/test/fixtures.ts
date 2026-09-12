import type { StaticParse } from "typebox";
import { ApiContext, type EventContext } from "../context.ts";
import type * as schemas from "../schemas.ts";

export const tokenApiCtx = new ApiContext(new URL("http://forgejo:3000/api/v1"), {
  basic: false,
  token: "test",
  username: "test",
});

export const basicApiCtx = new ApiContext(new URL("http://forgejo:3000/api/v1"), {
  basic: true,
  password: "test",
  username: "test",
});

export const mockApiCtx = tokenApiCtx;

export const mockIssue: StaticParse<typeof schemas.issueSchema> = {
  number: 1,
  user: { username: "test" },
  title: "test title",
  body: "test body",
  state: "open",
  pull_request: null,
};

export const mockPr: StaticParse<typeof schemas.pullRequestSchema> = {
  number: 3,
  user: { username: "test" },
  title: "test title",
  body: "test body",
  state: "open",
  head: { label: "test" },
  base: { label: "main" },
};

export const mockNewIssueEventCtx: EventContext = {
  repository: { full_name: "owner/repo", default_branch: "main" },
  event: {
    type: "issue",
    number: 1,
    user: { username: "test" },
    title: "tests",
    body: "propose a testing strategy",
    state: "open",
    pull_request: null,
    name: "issues_opened",
    comments: [],
    reviews: null,
  },
};

export const mockNewPrEventCtx: EventContext = {
  repository: { full_name: "owner/repo", default_branch: "main" },
  event: {
    type: "pull request",
    number: 3,
    user: { username: "test" },
    title: "feat: add tests",
    body: "adds the test suite",
    state: "open",
    head: { label: "feature/tests" },
    base: { label: "main" },
    name: "pull_request_opened",
    comments: [],
    reviews: null,
  },
};

export const mockReview: StaticParse<typeof schemas.prReviewSchema> & {
  comments: StaticParse<typeof schemas.prReviewCommentSchema>[];
} = {
  id: 1,
  body: "found an issue",
  user: { username: "test" },
  state: "REQUEST_CHANGES",
  commit_id: "abc123",
  submitted_at: "2024-01-01T00:00:00Z",
  comments: [
    {
      body: "this line is wrong",
      user: { username: "test" },
      path: "src/main.ts",
      position: 42,
      created_at: "2024-01-01T00:00:00Z",
    },
  ],
};

export const mockReviewRequestedEventCtx: EventContext = {
  repository: { full_name: "owner/repo", default_branch: "main" },
  event: {
    type: "pull request",
    number: 3,
    user: { username: "test" },
    title: "feat: add tests",
    body: "adds the test suite",
    state: "open",
    head: { label: "feature/tests" },
    base: { label: "main" },
    name: "pull_request_review_requested",
    comments: [],
    reviews: [mockReview],
  },
};
