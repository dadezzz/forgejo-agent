import { execFileSync } from "node:child_process";
import type { getAuthContext } from "./context.ts";
import { apiUrl } from "./forgejo/fetch.ts";

export function getLatestCommitId(): string {
  return execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
}

export function checkoutRepository(
  authCtx: ReturnType<typeof getAuthContext>,
  repositoryName: string,
  headBranch: string,
  baseBranch?: string,
) {
  const url = new URL(apiUrl);
  url.password = authCtx.token;
  url.pathname = repositoryName;

  execFileSync("git", ["init"]);
  execFileSync("git", ["remote", "add", "origin", url.href]);

  // Fetch the head branch, where the agent will operate.
  execFileSync("git", ["fetch", "-q", "-u", "origin", `${headBranch}:${headBranch}`]);

  // On PRs, fetch also the base branch, otherwise the agent gets confused since it can't find it.
  if (baseBranch) {
    execFileSync("git", ["fetch", "-q", "-u", "origin", `${baseBranch}:${baseBranch}`]);
  }

  // Checkout the head branch.
  execFileSync("git", ["checkout", headBranch]);
}
