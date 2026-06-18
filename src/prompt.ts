import { getIssue, getIssueComments } from "./forgejo.ts";
import * as context from "./context.ts";
import process from "node:process";

function exitBecauseNotMentioned() {
  console.log(`@${context.authUsername} not mentioned, exiting`);
  process.exit(0);
}

export async function buildPrompt(): Promise<string> {
  const issue = await getIssue(context.repository, context.issueNumber);
  const issueComments = await getIssueComments(context.repository, context.issueNumber);

  let prompt = `You are operating in the context of a Forgejo ${context.eventLocation} in the repository ${context.repository}.\n`;

  let instructions = [
    `- Your Forgejo username is ${context.authUsername}`,
    `- The ${context.eventLocation} number is ${context.issueNumber}`,
    `- Whatever you write, it will be posted as comment in the ${context.eventLocation}`,
  ];

  const prInstructions = [
    `- You are on a pull request branch (${context.headRef}) that will merge into ${context.baseRef}`,
    "- You can make changes to the code, but you must commit and push them or they will be lost",
  ];

  const issueInstructions = [
    `- You are on the default branch: ${context.refName}`,
    "- You cannot make changes to the code",
  ];

  const prReviewInstructions = [
    `- You are on a pull request branch (${context.headRef}) that will merge into ${context.baseRef}`,
    "- You have been assigned as a reviewer of the pull request. Report any findings with the 'submit-review' tool.",
    "- You cannot make changes to the code",
  ];

  switch (context.eventName) {
    case "pull_request_opened":
      if (!issue.body.includes(`@${context.authUsername}`)) {
        exitBecauseNotMentioned();
      }

      instructions = instructions.concat(prInstructions);

      break;
    case "issues_opened":
      if (!issue.body.includes(`@${context.authUsername}`)) {
        exitBecauseNotMentioned();
      }

      instructions = instructions.concat(issueInstructions);

      break;
    case "issue_comment_created":
      if (!issueComments[issueComments.length - 1].body.includes(`@${context.authUsername}`)) {
        exitBecauseNotMentioned();
      }

      if (context.eventLocation === "pull request") {
        instructions = instructions.concat(prInstructions);
      } else {
        instructions = instructions.concat(issueInstructions);
      }

      break;
    case "pull_request_review_requested":
      instructions = instructions.concat(prReviewInstructions);
      break;
    default:
      throw new Error(`unsupported event name: ${context.eventName}`);
  }

  prompt += `
  ${instructions.join("\n")}
  `;

  prompt += `
  ---

  Content of ${context.eventLocation.toUpperCase()} from user ${issue.user.username}:

  # ${issue.title}

  ${issue.body}

  ${issueComments.map((c) => `Comment from ${c.user.username}:\n\n${c.body}\n`).join("\n")}
  `;

  return prompt;
}
