# Testing

## Unit tests

Pure functions (prompt building, schema validation, context parsing, tool
parameter mapping, git helpers). No network, no containers — run on every PR.

```bash
pnpm test        # same as pnpm test:unit
pnpm test:unit
pnpm test:coverage
```

Unit tests live in `src/test/unit/` and mock the network calls with `vi.mock`,
so no real Forgejo instance is needed.

## Integration tests

The Forgejo client, the tools and `getEventContext` against a **real Forgejo
instance** running in the devcontainer. The payloads in
`examples/event_payloads/` are used only as a reference; tests always validate
live data so the schemas stay synced with the actual instance.

The Forgejo service is defined in `.devcontainer/docker-compose.yaml`. On
startup it reads `src/test/integration/forgejo.env` and creates the `test-admin`
(admin) and `test-bot` users. From the workspace container the instance is
reachable at `http://forgejo:3000`.

```bash
pnpm test:integration
```

`src/test/integration/setup.ts` runs before every integration test file and
keeps the data deterministic:

- deletes and recreates the `test-bot/integration-tests` repository;
- pushes a known README.md to `main` and creates the `test` branch with a
  one-line diff (used by the review tests for inline comments);
- seeds an issue with a comment.

The tests share configuration through `src/test/integration/shared.ts`.

### What is covered

- **Client** (`src/test/integration/forgejo.test.ts`): repositories, issues,
  comments, pull requests, reviews and inline review comments. Every call is
  validated against the TypeBox schemas by `forgejoFetch`.
- **Context** (`src/test/integration/context.test.ts`): `getEventContext` for
  issue and pull request events against live data.
- **Tools** (`src/test/integration/tools.test.ts`): all five tools execute
  against the real REST API, including `create-pr-review` (run from a checkout
  of the PR head branch so the git HEAD resolution is real too).
