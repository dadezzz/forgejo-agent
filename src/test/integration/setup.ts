// Runs before the integration test files are imported. The Forgejo client
// (src/forgejo/fetch.ts) reads FORGEJO_API_URL, CTX_AUTH_TOKEN and
// CTX_AUTH_USERNAME at module load, so the real instance credentials must be
// in the environment before any test file imports the client.
//
// The Forgejo instance is started by .devcontainer/docker-compose.yaml: it
// creates the bot user (as admin, so the setup can provision further users)
// from src/test/integration/forgejo.env; this setup creates the reviewer user
// through the admin API and seeds the repository with deterministic content:
// BASE_BRANCH with a known README.md and HEAD_BRANCH with an extra line, plus
// a seed issue with a comment, so every test run operates on fresh data.

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Type from "typebox";
import { forgejoFetch } from "../../forgejo/fetch.ts";
import { postIssue, postIssueComment } from "../../forgejo/index.ts";
import {
  apiCtx,
  BASE_BRANCH,
  FORGEJO_REVIEWER_PASSWORD,
  FORGEJO_REVIEWER_USERNAME,
  FORGEJO_USERNAME,
  HEAD_BRANCH,
  SEED_REPOSITORY,
  SEED_REPOSITORY_NAME,
} from "./shared.ts";

// Provision the instance-level reviewer account. User accounts live in the
// Forgejo volume and persist across runs, so the existence check makes this
// idempotent (fresh volumes create the user via the admin API, re-runs skip
// it). Forgejo forbids approving or rejecting your own pull request, so the
// review verdicts (APPROVED/REQUEST_CHANGES) need a user other than the bot.
async function ensureReviewerUser(): Promise<void> {
  try {
    await forgejoFetch(apiCtx, `/users/${FORGEJO_REVIEWER_USERNAME}`, Type.Object({}));
    return;
  } catch {
    // 404: user does not exist.
  }

  await forgejoFetch(apiCtx, `/admin/users`, Type.Object({}), {
    method: "POST",
    body: JSON.stringify({
      username: FORGEJO_REVIEWER_USERNAME,
      email: `${FORGEJO_REVIEWER_USERNAME}@example.com`,
      password: FORGEJO_REVIEWER_PASSWORD,
      must_change_password: false,
    }),
  });
}

// The collaborator endpoint answers 204 No Content, so it bypasses forgejoFetch
// (which always parses a JSON response) and is a plain PUT like the rest of the
// provisioning. Write access makes the reviewer an official contributor: its
// reviews come back with state APPROVED/REQUEST_CHANGES and are marked official.
async function addReviewerCollaborator(): Promise<void> {
  await forgejoFetch(apiCtx, `/repos/${SEED_REPOSITORY}/collaborators/${FORGEJO_REVIEWER_USERNAME}`, {
    method: "PUT",
    body: JSON.stringify({ permission: "write" }),
  });
}

// Wait for the server to be healthy.
const healthzUrl = new URL(apiCtx.url);
healthzUrl.pathname = "/api/healthz";
while (true) {
  try {
    await fetch(healthzUrl);
    break;
  } catch {
    // Not up yet, retry.
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
}

// Create the reviewer user if it isn't there yet (test-bot is created by the
// devcontainer entrypoint as an admin, so this goes through the admin API).
await ensureReviewerUser();

// Delete and recreate the repository so the data is deterministic.
try {
  await forgejoFetch(apiCtx, `/repos/${SEED_REPOSITORY}`, Type.Object({}), { method: "DELETE" });
} catch {
  // Do nothing if it didn't exist.
}
await forgejoFetch(apiCtx, `/user/repos`, Type.Object({}), {
  method: "POST",
  body: JSON.stringify({
    name: SEED_REPOSITORY_NAME,
    auto_init: true,
    default_branch: BASE_BRANCH,
  }),
});

// Grant the reviewer write access to the fresh repository, so it can submit
// approve/reject reviews as an official contributor.
await addReviewerCollaborator();

// Push deterministic base content and a change branch with a known diff. The
// change branch appends a line to README.md, so the added line is at position
// INLINE_POSITION in the new file (the diff is one added line).
const workDir = mkdtempSync(join(tmpdir(), "forgejo-agent-setup-"));
try {
  const repoDir = join(workDir, "repo");
  execFileSync("git", ["clone", "-q", apiCtx.getAuthRepoUrl(SEED_REPOSITORY), repoDir]);
  execFileSync("git", ["-C", repoDir, "config", "user.name", "CI [bot]"]);
  execFileSync("git", ["-C", repoDir, "config", "user.email", `${FORGEJO_USERNAME}@example.com`]);

  writeFileSync(join(repoDir, "README.md"), "# integration-tests\n\nline one\nline two\n");
  execFileSync("git", ["-C", repoDir, "add", "README.md"]);
  execFileSync("git", ["-C", repoDir, "commit", "-q", "-m", "chore: seed deterministic content"]);
  execFileSync("git", ["-C", repoDir, "push", "-q", "origin", BASE_BRANCH]);

  execFileSync("git", ["-C", repoDir, "checkout", "-q", "-b", HEAD_BRANCH]);
  appendFileSync(join(repoDir, "README.md"), "line three\n");
  execFileSync("git", ["-C", repoDir, "add", "README.md"]);
  execFileSync("git", ["-C", repoDir, "commit", "-q", "-m", "feat: add a line"]);
  execFileSync("git", ["-C", repoDir, "push", "-q", "origin", HEAD_BRANCH]);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

const newIssue = await postIssue(apiCtx, SEED_REPOSITORY, {
  title: "Integration test issue",
  body: "seeded by integration setup",
});

await postIssueComment(apiCtx, SEED_REPOSITORY, newIssue.number, { body: "integration seed comment" });
