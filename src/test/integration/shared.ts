import { ApiContext } from "../../context.ts";

export const FORGEJO_PASSWORD = process.env.FORGEJO_PASSWORD ?? "";
export const FORGEJO_USERNAME = process.env.FORGEJO_USERNAME ?? "";

export const apiCtx = new ApiContext(new URL("http://forgejo:3000/api/v1"), {
  basic: true,
  password: FORGEJO_PASSWORD,
  username: FORGEJO_USERNAME,
});

// A second user created by the setup through the admin API (test-bot is an
// admin) and added as a collaborator (write) to the seed repository. Forgejo
// forbids approving or rejecting your own pull request, so the reviewer
// verdicts (APPROVED/REQUEST_CHANGES) run as this user while test-bot creates
// the PRs.
export const FORGEJO_REVIEWER_PASSWORD = "test-reviewer";
export const FORGEJO_REVIEWER_USERNAME = "test-reviewer-123";

export const reviewerApiCtx = new ApiContext(new URL("http://forgejo:3000/api/v1"), {
  basic: true,
  password: FORGEJO_REVIEWER_PASSWORD,
  username: FORGEJO_REVIEWER_USERNAME,
});

export const SEED_REPOSITORY_NAME = "integration-tests";
export const SEED_REPOSITORY = `${FORGEJO_USERNAME}/${SEED_REPOSITORY_NAME}`;

export const BASE_BRANCH = "main";
export const HEAD_BRANCH = "test";

// Since the repository is recreated each time, the seeded issue is always the
// first.
export const SEED_ISSUE_NUMBER = 1;

// Position of the line that HEAD_BRANCH adds to README.md relative to
// BASE_BRANCH: the provisioned file has four lines, the change branch appends
// a fifth one.
export const INLINE_POSITION = 5;
