import { execFileSync } from "node:child_process";
import Value from "typebox/value";
import process from "node:process";
import Type from "typebox";
import type { getAuthContext } from "./context.ts";
import { apiUrl } from "./forgejo/fetch.ts";

const workspaceDir = Value.Parse(Type.String(), process.env.FORGEJO_WORKSPACE);

export function checkoutRepository(authCtx: ReturnType<typeof getAuthContext>, repositoryName: string, branch: string) {
  const url = new URL(apiUrl);
  url.password = authCtx.token;
  url.pathname = repositoryName;

  execFileSync("git", ["clone", `--branch=${branch}`, url.href, workspaceDir]);
}
