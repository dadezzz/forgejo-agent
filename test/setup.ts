// The Forgejo client reads these env vars at import time (src/forgejo/fetch.ts
// evaluates `process.env.FORGEJO_API_URL` and `getAuthContext()` at module
// load), so they must be set before any test imports the client.
process.env.FORGEJO_API_URL ??= "http://forgejo:3000/api/v1";
process.env.CTX_AUTH_TOKEN ??= "test-token";
process.env.CTX_AUTH_USERNAME ??= "ci-bot";
