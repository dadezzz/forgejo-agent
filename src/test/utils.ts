import type { ToolDefinition } from "@earendil-works/pi-coding-agent";

// The tools' execute signature takes extra runtime args (signal, onUpdate, ctx)
// that are irrelevant for these tests.
export function simpleExecute(tool: ToolDefinition, params: unknown) {
  // @ts-expect-error Setting undefined works on the last arg.
  return tool.execute("call-1", params, undefined, undefined, undefined);
}
