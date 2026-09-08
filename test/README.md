# Testing

## Unit tests

Pure functions (prompt building, schema validation, context parsing, tool
parameter mapping, git helpers). No network, no containers — run on every PR.

```bash
pnpm test        # same as pnpm test:unit
pnpm test:unit
pnpm test:coverage
```

Unit tests live next to the sources (`src/*.test.ts`) and use `test/setup.ts` to
provide the environment variables the Forgejo client reads at import time.

## Integration tests

The Forgejo client, the tools and `getEventContext` against a **real Forgejo
instance** (docker). The payloads in `examples/event_payloads/` are used only as
a reference; tests always validate live data so the schemas stay synced with the
actual instance.

```bash
# 1. Start the Forgejo instance (pin: 15.0.3, same version the payloads were
#    captured on).
docker compose -f docker-compose.test.yaml up -d --wait forgejo

# 2. Provision users, tokens, repository, change branch and a seed issue.
#    Writes test/integration/credentials.json (gitignored).
./scripts/integration-setup.sh

# 3. Run the integration tests.
pnpm test:integration
```

The provision script deletes and recreates the test repository on every run, so
the tests always operate on fresh, deterministic data. The same Forgejo service
is available in the devcontainer (`.devcontainer/docker-compose.yaml`), so the
tests can be run from the workspace container at `http://forgejo:3000`:

```bash
FORGEJO_API_URL=http://forgejo:3000/api/v1 ./scripts/integration-setup.sh
pnpm test:integration
```

### What is covered

- **Client** (`test/integration/forgejo.test.ts`): repositories, issues,
  comments, pull requests, reviews and inline review comments. Every call is
  validated against the TypeBox schemas by `forgejoFetch`.
- **Context** (`test/integration/context.test.ts`): `getEventContext` for issue
  and pull request events against live data.
- **Tools** (`test/integration/tools.test.ts`): all five tools execute against
  the real REST API, including `create-pr-review` (run from a checkout of the PR
  head branch so the git HEAD resolution is real too).
