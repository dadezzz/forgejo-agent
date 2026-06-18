import { getIssue, getIssueComments } from "./forgejo.ts";
import * as context from "./context.ts";
import process from "node:process";

export async function buildPrompt(): Promise<string> {
  const issue = await getIssue(context.repository, context.issueNumber);
  const issueComments = await getIssueComments(context.repository, context.issueNumber);

  let prompt = `You are operating in the context of a Forgejo ${context.eventLocation} in the repository ${context.repository}.\n`;

  let instructions = [
    `- Your Forgejo username is ${context.authUsername}`,
    `- The ${context.eventLocation} number is ${context.issueNumber}`,
    `- Whatever the user asks you, you should respond with a comment in the ${context.eventLocation} using the create-issue-comment tool`,
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
      instructions = instructions.concat(prInstructions);
      break;
    case "issues_opened":
      instructions = instructions.concat(issueInstructions);
      break;
    case "issue_comment_created":
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

  prompt += `\n${instructions.join("\n")}\n\n`;

  prompt += `---\n\n### start ${context.eventLocation} content from user ${issue.user.username} ###\n# ${issue.title}\n`;
  if (issue.body) {
    prompt += `\n${issue.body}\n`;
  }
  prompt += `### end ${context.eventLocation} content ###\n`;

  if (issueComments.length > 0) {
    for (const c of issueComments) {
      prompt += `### start comment from ${c.user.username} ###\n`;
      prompt += `${c.body}\n`;
      prompt += `### end comment ###\n`;
    }
  }

  console.log("### START PROMPT ###");
  console.log(prompt);
  console.log(`### END PROMPT ###`);
  return prompt;
}
