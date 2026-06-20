# ci-forgejo-agent

`ci-forgejo-agent` is a composite GitHub Action (Forgejo-compatible) that runs
an AI coding agent in response to:

- **Issue comments** — when someone mentions the agent's username in a comment
- **Issues opened** — when a new issue is opened mentioning the agent
- **Pull requests opened** — when a PR is opened mentioning the agent
- **Pull request review requests** — when the agent is assigned as a reviewer

The agent uses the
[Pi Coding Agent SDK](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
to reason about code, make changes, and interact with the repository through
custom Forgejo API tools.

## Features

- Responds to issue and PR comments mentioning the agent's username
- Reads issue/PR content and conversation history
- Makes code changes via git commits and pushes
- Creates, closes, and comments on issues
- Creates pull requests when working on the default branch
- Supports pull request review with findings submission

## Quick Start

Add this action to your Forgejo workflow:

```yaml
- uses: infra/ci-forgejo-agent@v1
  with:
    # Create a token for the llm-bot user with repository:write and issue:write
    # permissions.
    auth-token: ${{ secrets.AGENT_TOKEN }}
    # I recommend creating a separate user to restrict permissions for the agent.
    auth-username: llm-bot
    git-author: llm-bot
    git-email: llm-bot@example.com
```

| Input           | Description                    | Required |
| --------------- | ------------------------------ | -------- |
| `auth-token`    | Forgejo API token              | Yes      |
| `auth-username` | Username the agent responds to | Yes      |
| `git-author`    | Git author name for commits    | Yes      |
| `git-email`     | Git email for commits          | Yes      |

## Building from Source

```bash
# Install the dependencies and build.
pnpm install
pnpm build

# Run the final executable.
./dist/ci-forgejo-agent
```

The build produces a single self-contained binary using Node.js
[SEA](https://nodejs.org/api/single-executable-applications.html) (Single
Executable Application).

## Project Structure

```
src/
├── main.ts       # Agent session entry point
├── git.ts        # Git repository cloning/checkout
├── forgejo/      # Forgejo API client
│   ├── fetch.ts  # HTTP client
│   └── index.ts  # API endpoint functions
├── context.ts    # Runtime context from environment
├── prompt.ts     # Prompt builder for the agent
├── tools.ts      # Custom Forgejo tools
└── schemas.ts    # TypeBox schemas
examples/
└── event_payloads/  # Sample webhook payloads
```

## License

MIT
