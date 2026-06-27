import { createAgentSession, SessionManager, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import * as tools from "./tools.ts";
import { buildPrompt } from "./prompt.ts";
import { getAuthContext, getEventContext } from "./context.ts";
import { checkoutRepository } from "./git.ts";

const authCtx = getAuthContext();
const eventCtx = await getEventContext();

if (eventCtx.event.type === "pull request") {
  checkoutRepository(authCtx, eventCtx.repository.full_name, eventCtx.event.head.label, eventCtx.event.base.label);
} else {
  checkoutRepository(authCtx, eventCtx.repository.full_name, eventCtx.repository.default_branch);
}

const customTools: ToolDefinition[] = [tools.createIssue, tools.closeIssue, tools.createIssueComment, tools.createPr];

if (eventCtx.event.name === "pull_request_review_requested") {
  customTools.push(tools.createPrReview);
}

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  customTools,
});

session.subscribe((l) => {
  if (l.type === "message_end")
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
              console.log(`\n::group::Tool call: ${m.name}`);
              console.log(m.arguments);
              console.log("::endgroup::");
              break;
          }
        }

        break;
    }
});

const userPrompt = buildPrompt(authCtx, eventCtx);
console.log("::group::Prompt");
console.log(userPrompt);
console.log("::endgroup::");

await session.prompt(userPrompt);
