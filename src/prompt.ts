import type { getAuthContext, getEventContext } from "./context.ts";

export async function buildPrompt(
  authCtx: ReturnType<typeof getAuthContext>,
  eventCtx: Awaited<ReturnType<typeof getEventContext>>,
): Promise<string> {
  let prompt = `You are the ${authCtx.username} user operating in the context of Forgejo ${eventCtx.event.type} number ${eventCtx.event.number} in the repository ${eventCtx.repository.full_name}.`;

  prompt += `\n\nYou can perform git operations using the \`bash\` tool.`;
  prompt += `\nIf you commit code you can upload it with \`git push\`; the upstream branch is created automatically.`;

  if (eventCtx.event.type === "pull request") {
    prompt += `\nThe code you are seeing is from the upstream branch ${eventCtx.event.head.label} that will merge into ${eventCtx.event.base.label}.`;
    prompt += "\nYou can make changes, but must commit and push them upstream or they will be lost.";
  } else {
    prompt += `\nThe code you are seeing is from the upstream default branch: ${eventCtx.repository.default_branch}.`;
    prompt += `\nYou can make changes, but must commit and push them in a new branch and create a pull request (\`create-pull-request\` tool) or they will be lost.`;
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

  return prompt;
}
