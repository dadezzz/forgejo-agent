import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { StaticParse, TSchema } from "typebox";
import { createBranch, postPr } from "../forgejo/index.ts";
import type { ApiContext } from "../context.ts";
import { BASE_BRANCH, HEAD_BRANCH } from "./integration/shared.ts";

// The tools' execute signature takes extra runtime args (signal, onUpdate, ctx)
// that are irrelevant for these tests.
export function simpleExecute<S extends TSchema>(tool: ToolDefinition<S>, params: StaticParse<S>) {
  // @ts-expect-error Setting undefined works on the last arg.
  return tool.execute("call-1", params, undefined, undefined, undefined);
}

// Creates a pull request from a fresh branch forked from HEAD_BRANCH, so every
// PR carries the provisioned diff (one added line on README.md) but has its
// own head/base pair — Forgejo only allows one open PR per pair.
export async function createTestPr(apiCtx: ApiContext, repo: string, title: string) {
  const head = `pr-${Date.now()}`;
  const branch = await createBranch(apiCtx, repo, HEAD_BRANCH, head);
  const pr = await postPr(apiCtx, repo, { title, body: "", head, base: BASE_BRANCH });
  return { pr, branch };
}
