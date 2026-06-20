import type { getAuthContext, getEventContext } from "./context.ts";

export async function buildPrompt(
  authCtx: ReturnType<typeof getAuthContext>,
  eventCtx: Awaited<ReturnType<typeof getEventContext>>,
): Promise<string> {
  let prompt = `You are the ${authCtx.username} user operating in the context of Forgejo ${eventCtx.event.type} number ${eventCtx.event.number} in the repository ${eventCtx.repository.full_name}.`;

  prompt += "\n\nThe git repository is in detached HEAD state. You can perform git operations using the `bash` tool.";
  prompt +=
    "\nIf you commit code you must create a new branch with `git switch -c` and then upload it with `git push`; the upstream branch is created automatically.";

  if (eventCtx.event.type === "pull request") {
    prompt += `\n\nThe code you are seeing is from the upstream pull request branch ${eventCtx.event.head.label} that will merge into ${eventCtx.event.base.label}. You can make changes, but must commit and push them upstream or they will be lost.`;
  } else {
    prompt += `\n\nThe code you are seeing is from the upstream default branch: ${eventCtx.repository.default_branch}. You can make changes, but must commit and push them in a new pull request (you have the create-pull-request tool) or they will be lost.`;
  }

  if (eventCtx.event.name === "pull_request_review_requested") {
    prompt += `\n\nYou have been assigned as a reviewer of the pull request. Report any findings with the \`submit-review\` tool.`;
  } else {
    prompt += `\n\nAt the end, you should respond with a comment in the ${eventCtx.event.type} using the create-issue-comment tool`;
  }

  prompt += `\n\n---\n\n### start ${eventCtx.event.type} content from user ${eventCtx.event.user.username} ###\n# ${eventCtx.event.title}`;
  prompt += eventCtx.event.body ? `\n\n${eventCtx.event.body}` : "";
  prompt += `\n### end ${eventCtx.event.type} content ###`;

  for (const c of eventCtx.event.comments) {
    prompt += `\n### start comment from ${c.user.username} ###`;
    prompt += `\n${c.body}`;
    prompt += `\n### end comment ###`;
  }

  console.log("### START PROMPT ###");
  console.log(prompt);
  console.log(`### END PROMPT ###`);
  return prompt;
}
