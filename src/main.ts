import { createAgentSession, SessionManager, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { inspect } from "node:util";
import * as tools from "./tools.ts";
import { buildPrompt } from "./prompt.ts";
import { ApiContext, getEventContext } from "./context.ts";
import { checkoutRepository } from "./git.ts";

const apiCtx = ApiContext.fromEnv();
const eventCtx = await getEventContext(apiCtx);

if (eventCtx.event.type === "pull request") {
  checkoutRepository(apiCtx, eventCtx.repository.full_name, eventCtx.event.head.label, eventCtx.event.base.label);
} else {
  checkoutRepository(apiCtx, eventCtx.repository.full_name, eventCtx.repository.default_branch);
}

const customTools: ToolDefinition[] = [
  tools.createCloseIssueTool(apiCtx, eventCtx),
  tools.createCreateIssueTool(apiCtx, eventCtx),
  tools.createCreateIssueCommentTool(apiCtx, eventCtx),
  tools.createCreatePrTool(apiCtx, eventCtx),
];

if (eventCtx.event.name === "pull_request_review_requested") {
  customTools.push(tools.createCreatePrReviewTool(apiCtx, eventCtx));
}

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  customTools,
});

const pendingToolCallArgs = new Map<string, unknown>();

session.subscribe((l) => {
  switch (l.type) {
    case "message_end": {
      switch (l.message.role) {
        case "assistant":
          for (const m of l.message.content) {
            switch (m.type) {
              case "text":
                console.log(`\n${m.text.trim()}`);
                break;
              case "thinking":
                console.log("\n::group::Thinking");
                console.log(m.thinking.trim());
                console.log("::endgroup::");
                break;
              case "toolCall":
                pendingToolCallArgs.set(m.id, m.arguments);
                break;
            }
          }

          break;
      }

      break;
    }
    case "tool_execution_end": {
      const args = pendingToolCallArgs.get(l.toolCallId);
      console.log(`\n::group::Tool call: ${l.toolName}`);
      console.log(`args = ${inspect(args, { depth: null })}`);
      console.log(`result = ${inspect(l.result, { depth: null })}`);
      console.log("::endgroup::");

      break;
    }
  }
});

const userPrompt = buildPrompt(apiCtx, eventCtx);
console.log("::group::Prompt");
console.log(userPrompt);
console.log("::endgroup::");

await session.prompt(userPrompt);
