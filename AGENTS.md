# AGENTS.md

This file provides guidance for AI agents operating in this repository.

## Project Overview

`ci-forgejo-agent` is an AI coding agent for Forgejo, built on the
[Pi Coding Agent SDK](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).
It runs as a single self-contained binary and responds to Forgejo events
(issues, pull requests, comments) to help with code review, bug fixes, and
feature development.

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js 26 (Alpine)
- **Bundler:** [Rolldown](https://rolldown.rs/) with Node.js SEA for
  single-binary output
- **Schema Validation:** [TypeBox](https://github.com/sinclairzx81/typebox)
- **Package Manager:** pnpm

## Build & Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build the SEA binary
pnpm check         # TypeScript type check
pnpm lint:check    # Biome lint check
pnpm format:check  # Biome format check
pnpm lint:fix      # Biome lint with auto-fix
pnpm format:fix    # Biome format with auto-fix
```

## Architecture

The agent follows a simple flow:

1. **Context** (`src/context.ts`) — Reads environment variables (API URL, auth
   token, event type, issue/PR number) and validates them with TypeBox schemas.
2. **Git Checkout** (`src/git.ts`) — Clones the target repository and checks out
   the appropriate branch (PR branch or default branch) before the agent runs.
3. **Prompt Builder** (`src/prompt.ts`) — Fetches the issue/PR content and
   comments via the Forgejo API, then constructs a structured prompt for the
   agent.
4. **Forgejo Client** (`src/forgejo/`) — Split into `fetch.ts` (HTTP client) and
   `index.ts` (API endpoint functions wrapping the Forgejo REST API for issues,
   comments, and pull requests).
5. **Custom Tools** (`src/tools.ts`) — Four tools exposed to the agent:
   `close-issue`, `create-issue`, `create-issue-comment`, `create-pull-request`.
6. **Entry Point** (`src/main.ts`) — Clones the repository, creates a Pi agent
   session with the custom tools, logs tool calls and messages, and runs the
   prompt.

## Event Handling

The agent handles four event types (defined in `src/schemas.ts`):

| Event                           | Trigger                    | Branch Mode               |
| ------------------------------- | -------------------------- | ------------------------- |
| `issue_comment_created`         | Comment mentions agent     | PR branch or issue branch |
| `issues_opened`                 | New issue mentions agent   | Default protected branch  |
| `pull_request_opened`           | New PR mentions agent      | PR feature branch         |
| `pull_request_review_requested` | Agent assigned as reviewer | PR feature branch         |

For PR branches, the agent can commit and push directly. For the default branch,
it must use `create-pull-request` to propose changes.

## CI/CD

- **Releases:** Semantic release via `.releaserc.json` — auto-increments version
  and updates `action.yaml`.
- **Container:** `ci.Dockerfile` for building the image used in CI (Node 26 +
  pnpm + curl + git).
- **Dev Container:** `.devcontainer/` for local development. Uses the same image
  as CI.

## Conventions

- Semantic commit messages (es: `fix(prompt): grammar error`).
- No framework — plain TypeScript with ES modules.
- Biome for linting and formatting (`biome.jsonc`).
- YAML linting via `.yamllint.yaml`.
- Prettier ignore for generated files (`.prettierignore`).
