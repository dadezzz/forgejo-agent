import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import * as tools from "./tools.ts";
import { buildPrompt } from "./prompt.ts";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  customTools: [tools.createIssue, tools.closeIssue, tools.createIssueComment, tools.createPullRequest],
});

session.subscribe((l) => {
  if (l.type === "message_end")
    switch (l.message.role) {
      case "assistant":
        for (const m of l.message.content) {
          switch (m.type) {
            case "text":
              console.log(m.text.trim());
              break;
            case "thinking":
              console.log("### START THINKING ###");
              console.log(m.thinking.trim());
              console.log("### END THINKING ###");
              break;
            case "toolCall":
              console.log("### START TOOL CALL ###");
              console.log(`${m.name} ${JSON.stringify(m.arguments)}`);
              console.log("### END TOOL CALL ###");
              break;
          }
        }

        break;
    }
});

await session.prompt(await buildPrompt());
