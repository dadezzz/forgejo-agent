import Type from "typebox";
import Value from "typebox/value";
import { forgejoFetch } from "./fetch.ts";
import process from "node:process";
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const eventNameSchema = Type.String();
const eventName = Value.Parse(eventNameSchema, process.env.FORGEJO_EVENT_NAME);
if (eventName !== "issue_comment") {
  throw new Error("this action works only with events of type 'issue'");
}

const contextRepositorySchema = Type.String({ pattern: /.+\/.+/ });
const contextRepository = Value.Parse(contextRepositorySchema, process.env.FORGEJO_REPOSITORY);
const contextIssueNumberSchema = Type.String({ pattern: /[0-9]+/ });
const contextIssueNumber = Number.parseInt(Value.Parse(contextIssueNumberSchema, process.env.INPUT_ISSUE_NUMBER), 10);

const contextModelSchema = Type.String({ pattern: /[0-9]+/ });
const _contextModel = Value.Parse(contextModelSchema, process.env.INPUT_MODEL);

const issueSchema = Type.Object({
  number: Type.Number(),
  user: Type.Object({
    username: Type.String(),
  }),
  title: Type.String(),
  body: Type.String(),
});

const issueCommentSchema = Type.Object({
  user: Type.Object({
    username: Type.String(),
  }),
  body: Type.String(),
});

async function getIssueComments(issueNumber: number): Promise<{ author: string; body: string }[]> {
  const issue = await forgejoFetch("GET", `/repos/${contextRepository}/issues/${issueNumber}`, null, issueSchema);

  const forgejoComments = await forgejoFetch(
    "GET",
    `/repos/${contextRepository}/issues/${issueNumber}/comments`,
    null,
    Type.Array(issueCommentSchema),
  );

  return [
    { author: issue.user.username, body: `# ${issue.title}\n\n${issue.body}` },
    ...forgejoComments.map((c) => ({ author: c.user.username, body: c.body })),
  ];
}

const issueComments = await getIssueComments(contextIssueNumber);
const lastIssueComment = issueComments.at(issueComments.length - 1);
if (!lastIssueComment?.body.startsWith("@llm-bot ")) {
  process.exit(0);
}

const prompt = `
You are a coding assistant operating inside a Forgejo issue or pull
request. You respond to the last comment in the history.

Your forgejo username is llm-bot.

---

Comments history:

${issueComments.map((c) => `### START COMMENT FROM: ${c.author} ###\n${c.body}\n### END COMMENT ###`).join("\n")}
`;

async function postIssueComment(issueNumber: number, body: string): Promise<void> {
  await forgejoFetch(
    "POST",
    `/repos/${contextRepository}/issues/${issueNumber}/comments`,
    JSON.stringify({ body }),
    issueCommentSchema,
  );
}

// TODO: create tools

// - post issue
// - post pull request review

// - get issue comments
// - get pull request comments

const { session } = await createAgentSession();
await session.prompt(prompt);
await session.agent.waitForIdle();

const message = session.messages.at(session.messages.length - 1);
if (message?.role !== "assistant") {
  throw new Error("last message not found or not from assistant");
}

const messageStr = message.content
  .map((m) => {
    let message: string;

    switch (m.type) {
      case "text":
        message = m.text;
        break;
      case "thinking":
        message = "> Thinking\n";
        break;
      case "toolCall":
        message =
          "> " +
          m.name +
          Object.entries(m.arguments)
            .map(([k, v]) => ` [${k}=${v}]`)
            .join("") +
          "\n";
        break;
    }

    return message;
  })
  .join("\n");

await postIssueComment(contextIssueNumber, messageStr);
