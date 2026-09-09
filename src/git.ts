import { execFileSync } from "node:child_process";
import type { ApiContext } from "./context.ts";

export function getLatestCommitId(): string {
  return execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
}

export function checkoutRepository(apiCtx: ApiContext, repo: string, headBranch: string, baseBranch?: string) {
  execFileSync("git", ["init"]);
  execFileSync("git", ["remote", "add", "origin", apiCtx.getAuthRepoUrl(repo)]);

  // Fetch the head branch, where the agent will operate.
  execFileSync("git", ["fetch", "-q", "-u", "origin", `${headBranch}:${headBranch}`]);

  // On PRs, fetch also the base branch, otherwise the agent gets confused since it can't find it.
  if (baseBranch) {
    execFileSync("git", ["fetch", "-q", "-u", "origin", `${baseBranch}:${baseBranch}`]);
  }

  // Checkout the head branch.
  execFileSync("git", ["checkout", headBranch]);
}
