// Shared helpers for the integration tests: the connection details written by
// scripts/integration-setup.sh and a small typed wrapper around fetch for
// seeding data and asserting outcomes via the Forgejo REST API.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface Credentials {
  apiUrl: string;
  username: string;
  token: string;
  repository: string;
  adminUsername: string;
  adminToken: string;
  seedIssueNumber: number;
  headSha: string;
  headBranch: string;
  baseBranch: string;
  inlinePosition: number;
}

const credentialsPath = fileURLToPath(new URL("./credentials.json", import.meta.url));

export const credentials = JSON.parse(readFileSync(credentialsPath, "utf8")) as Credentials;

export async function api<T = unknown>(
  pathname: string,
  init: RequestInit = {},
  token = credentials.token,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("authorization", `Bearer ${token}`);
  if (init.body) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(credentials.apiUrl + pathname, { ...init, headers });
  if (response.status >= 400) {
    throw new Error(`api ${init.method ?? "GET"} ${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export interface IssueLike {
  number: number;
  title: string;
  state: string;
  user: { username: string };
}

export interface PullRequestLike {
  number: number;
  title: string;
  state: string;
  head: { label: string };
  base: { label: string };
}

export interface ReviewLike {
  id: number;
  body: string;
}

export async function createIssue(title: string, body: string, token = credentials.token): Promise<IssueLike> {
  return await api(
    `/repos/${credentials.repository}/issues`,
    {
      method: "POST",
      body: JSON.stringify({ title, body }),
    },
    token,
  );
}

// Authenticated git URL of the test repository (used to clone the PR head
// branch so tools that resolve the git HEAD see the right commit).
export function repositoryCloneUrl(): string {
  const baseUrl = credentials.apiUrl.replace(/\/api\/v1$/, "");
  const scheme = baseUrl.slice(0, baseUrl.indexOf("://"));
  const host = baseUrl.slice(baseUrl.indexOf("://") + 3);
  return `${scheme}://${credentials.username}:${credentials.token}@${host}/${credentials.repository}.git`;
}

// Creates a pull request from a fresh branch. Forgejo only allows one open PR
// per head/base pair, so every PR gets its own branch (created from the
// provisioned change branch, keeping the same diff).
export async function createPullRequest(title: string, token = credentials.token): Promise<PullRequestLike> {
  const branch = `pr-${Date.now()}`;
  await api(
    `/repos/${credentials.repository}/branches`,
    {
      method: "POST",
      body: JSON.stringify({ new_branch_name: branch, old_branch_name: credentials.headBranch }),
    },
    token,
  );
  return await api(
    `/repos/${credentials.repository}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        body: "body",
        head: branch,
        base: credentials.baseBranch,
      }),
    },
    token,
  );
}
