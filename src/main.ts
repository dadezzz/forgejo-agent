import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import * as context from "./context.ts";
import { postIssueComment } from "./forgejo.ts";
import * as tools from "./tools.ts";
import { buildPrompt } from "./prompt.ts";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  customTools: [tools.createIssue, tools.closeIssue],
});

let messageStr = "";
session.subscribe((l) => {
  if (l.type === "message_end")
    switch (l.message.role) {
      case "assistant":
        for (const m of l.message.content) {
          switch (m.type) {
            case "text":
              console.log(m.text);
              messageStr += m.text;
              break;
            case "thinking":
              console.log("> start thinking");
              console.log(m.thinking);
              console.log("> end thinking");
              break;
            case "toolCall":
              console.log(`> tool call: ${m.name} ${JSON.stringify(m.arguments)}`);
              break;
          }
        }

        break;
      case "toolResult":
        if (l.message.isError) {
          console.log(`tool call failed for ${l.message.toolName}: ${JSON.stringify(l.message.content)}`);
        }

        break;
    }
});

await session.prompt(await buildPrompt());
await postIssueComment(context.repository, context.issueNumber, { body: messageStr });
