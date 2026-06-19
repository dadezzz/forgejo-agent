import { getIssue, getIssueComments } from "./forgejo.ts";
import * as context from "./context.ts";

export async function buildPrompt(): Promise<string> {
  const issue = await getIssue(context.repository, context.issueNumber);
  const issueComments = await getIssueComments(context.repository, context.issueNumber);

  let prompt = `You are operating in the context of a Forgejo ${context.eventLocation} in the repository ${context.repository}.`;

  let instructions = [
    `- Your Forgejo username is ${context.authUsername}`,
    `- The ${context.eventLocation} number is ${context.issueNumber}`,
    `- You should respond with a comment in the ${context.eventLocation} using the create-issue-comment tool`,
    "- You are on a detached HEAD state, if you commit code you must create a new branch with `git switch -c`",
    "- You can simply use `git push` since the remote branch is created automatically",
    "- All git operations must be performed using the `bash` tool",
  ];

  const prInstructions = [
    `- The code you are seeing is from the upstream pull request branch ${context.headRef} that will merge into ${context.baseRef}`,
    "- You can make changes to the code, but you must commit and push them to the upstream branch or they will be lost.",
  ];

  const issueInstructions = [
    `- The code you are seeing is from the upstream default branch: ${context.refName}`,
    "- You can make changes to the code but need to push them in a new pull request (you have the create-pull-request tool) or they will be lost.",
  ];

  const prReviewInstructions = [
    "- You have been assigned as a reviewer of the pull request. Report any findings with the 'submit-review' tool.",
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
      instructions = instructions.concat(prInstructions).concat(prReviewInstructions);
      break;
    default:
      throw new Error(`unsupported event name: ${context.eventName}`);
  }

  prompt += `\n\n${instructions.join("\n")}`;

  prompt += `\n\n---\n\n### start ${context.eventLocation} content from user ${issue.user.username} ###\n# ${issue.title}`;
  if (issue.body) {
    prompt += `\n\n${issue.body}`;
  }
  prompt += `\n### end ${context.eventLocation} content ###`;

  if (issueComments.length > 0) {
    for (const c of issueComments) {
      prompt += `\n### start comment from ${c.user.username} ###`;
      prompt += `\n${c.body}`;
      prompt += `\n### end comment ###`;
    }
  }

  console.log("### START PROMPT ###");
  console.log(prompt);
  console.log(`### END PROMPT ###`);
  return prompt;
}
