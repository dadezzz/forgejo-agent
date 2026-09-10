// Runs before the integration test files are imported. The Forgejo client
// (src/forgejo/fetch.ts) reads FORGEJO_API_URL, CTX_AUTH_TOKEN and
// CTX_AUTH_USERNAME at module load, so the real instance credentials must be
// in the environment before any test file imports the client.
//
// The Forgejo instance is started by .devcontainer/docker-compose.yaml: it
// creates the admin and bot users from src/test/integration/forgejo.env. This
// setup seeds the repository with deterministic content: BASE_BRANCH with a
// known README.md and HEAD_BRANCH with an extra line, plus a seed issue with a
// comment, so every test run operates on fresh data.

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Type from "typebox";
import { forgejoFetch } from "../../forgejo/fetch.ts";
import { postIssue, postIssueComment } from "../../forgejo/index.ts";
import { apiCtx, BASE_BRANCH, FORGEJO_USERNAME, HEAD_BRANCH, SEED_REPOSITORY, SEED_REPOSITORY_NAME } from "./shared.ts";

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
