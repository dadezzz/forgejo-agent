// Runs before the integration test files are imported. The Forgejo client
// (src/forgejo/fetch.ts) reads FORGEJO_API_URL, CTX_AUTH_TOKEN and
// CTX_AUTH_USERNAME at module load, so the real instance credentials must be
// in the environment before any test file imports the client.
//
// Credentials are loaded from test/integration/credentials.json, written by
// scripts/integration-setup.sh against a real Forgejo instance. The file is
// required: silently falling back to ambient environment variables would risk
// pointing the tests at the wrong instance.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const credentialsPath = fileURLToPath(new URL("./credentials.json", import.meta.url));

let credentials: {
  apiUrl: string;
  username: string;
  token: string;
};
try {
  credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
} catch {
  throw new Error(
    [
      `Missing ${credentialsPath}.`,
      "Integration tests need a running Forgejo instance with provisioned credentials.",
      "Run:",
      "  docker compose -f docker-compose.test.yaml up -d --wait forgejo",
      "  ./scripts/integration-setup.sh",
      "then run pnpm test:integration",
    ].join("\n"),
  );
}

process.env.FORGEJO_API_URL = credentials.apiUrl;
process.env.CTX_AUTH_TOKEN = credentials.token;
process.env.CTX_AUTH_USERNAME = credentials.username;
