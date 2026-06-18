import process from "node:process";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import * as context from "./context.ts";
import { getIssue, getIssueComments, postIssueComment } from "./forgejo.ts";

const issue = await getIssue(context.issueNumber);
const issueComments = await getIssueComments(context.issueNumber);

const lastCommentBody = issueComments.length > 0 ? issueComments[issueComments.length - 1].body : issue.body;
if (!lastCommentBody.includes(`@${context.authUsername}`)) {
  console.log(`@${context.authUsername} not mentioned, exiting`);
  process.exit(0);
}

const prompt = `\
You are a coding assistant operating inside a Forgejo issue or pull
request. You respond to the last comment in the history.

Your Forgejo username is ${context.authUsername}.

---

Comments history:

### START ISSUE FROM: ${issue.user.username} ###
${issue.title}

${issue.body}
### END ISSUE ###
${issueComments
  .map(
    (c) => `\
### START ISSUE COMMENT FROM: ${c.user.username} ###
${c.body}
### END ISSUE COMMENT ###`,
  )
  .join("\n")}`;

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
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

await session.prompt(prompt);
await postIssueComment(context.issueNumber, messageStr);
