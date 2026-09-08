#!/bin/sh
set -eu
# pipefail is not POSIX but is supported by busybox ash and bash; no-op elsewhere.
set -o pipefail 2>/dev/null || true

# Provisions a local Forgejo instance (docker-compose.test.yaml) with users,
# access tokens, a repository containing a change branch with a known diff, and
# a seeded issue. The connection details are written to
# test/integration/credentials.json, which the vitest integration tests load at
# startup.
#
# The repository is deleted and recreated on every run so the tests always
# operate on fresh, deterministic data.
#
# Overridable environment variables:
#   FORGEJO_API_URL  base API URL (default http://localhost:3000/api/v1)
#   E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD  admin user (default davide)
#   E2E_BOT_USERNAME / E2E_BOT_PASSWORD      bot user (default ci-bot)
#   E2E_REPO_NAME                            test repository name

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.test.yaml"
CREDENTIALS_DIR="$ROOT_DIR/test/integration"
CREDENTIALS_FILE="$CREDENTIALS_DIR/credentials.json"

API_URL="${FORGEJO_API_URL:-http://localhost:3000/api/v1}"
BASE_URL="${API_URL%/api/v1}"
BASE_SCHEME="${BASE_URL%%://*}"
BASE_HOST="${BASE_URL#*://}"

ADMIN_USERNAME="${E2E_ADMIN_USERNAME:-davide}"
ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-admin-pass-123}"
BOT_USERNAME="${E2E_BOT_USERNAME:-ci-bot}"
BOT_PASSWORD="${E2E_BOT_PASSWORD:-bot-pass-123}"
REPO_NAME="${E2E_REPO_NAME:-integration-tests}"
REPOSITORY="$BOT_USERNAME/$REPO_NAME"

mkdir -p "$CREDENTIALS_DIR"

# 1. Start the Forgejo instance and wait for its healthcheck.
docker compose -f "$COMPOSE_FILE" up -d --wait forgejo

# 2. Wait for the API to answer.
for _ in $(seq 1 60); do
  if curl -sf "$API_URL/version" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -sf "$API_URL/version" >/dev/null || {
  echo "error: Forgejo API not reachable at $API_URL" >&2
  exit 1
}

forgejo_cli() {
  docker compose -f "$COMPOSE_FILE" exec -T -u git forgejo forgejo "$@"
}

# 3. Create the users (fail silently if they already exist).
forgejo_cli admin user create --username "$ADMIN_USERNAME" --password "$ADMIN_PASSWORD" \
  --email "$ADMIN_USERNAME@example.com" --admin --must-change-password=false >/dev/null 2>&1 || true
forgejo_cli admin user create --username "$BOT_USERNAME" --password "$BOT_PASSWORD" \
  --email "$BOT_USERNAME@example.com" --must-change-password=false >/dev/null 2>&1 || true

# 4. Generate fresh access tokens (unique names so re-runs don't collide).
TOKEN_SUFFIX="$(date +%s)"
ADMIN_TOKEN="$(forgejo_cli admin user generate-access-token --username "$ADMIN_USERNAME" \
  --token-name "admin-token-$TOKEN_SUFFIX" --raw | tail -n 1 | tr -d '\r')"
BOT_TOKEN="$(forgejo_cli admin user generate-access-token --username "$BOT_USERNAME" \
  --token-name "ci-bot-token-$TOKEN_SUFFIX" --raw | tail -n 1 | tr -d '\r')"

# 5. Delete and recreate the repository so the data is deterministic.
curl -sf -X DELETE -H "Authorization: token $BOT_TOKEN" "$API_URL/repos/$REPOSITORY" >/dev/null || true
curl -sf -X POST -H "Authorization: token $BOT_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"integration test repository\",\"auto_init\":true,\"default_branch\":\"main\"}" \
  "$API_URL/user/repos" >/dev/null

# 6. Push deterministic base content and a change branch with a known diff.
#    The change branch appends a line to README.md, so the added line is at
#    position INLINE_POSITION in the new file (the diff is one added line).
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
git clone -q "$BASE_SCHEME://$BOT_USERNAME:$BOT_TOKEN@$BASE_HOST/$REPOSITORY.git" "$TMP_DIR/repo"

cd "$TMP_DIR/repo"
git config user.name "CI [bot]"
git config user.email "$BOT_USERNAME@example.com"

printf '# integration-tests\n\nline one\nline two\n' >README.md
git add README.md
git commit -q -m "chore: seed deterministic content"
git push -q origin main

git checkout -q -b feature/change
printf 'line three\n' >>README.md
git add README.md
git commit -q -m "feat: add a line"
git push -q origin feature/change
HEAD_SHA="$(git rev-parse HEAD)"

cd "$ROOT_DIR"

# 7. Seed an issue with a comment as the admin user.
SEED_ISSUE="$(curl -sf -X POST -H "Authorization: token $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Integration test issue","body":"seeded by integration setup"}' \
  "$API_URL/repos/$REPOSITORY/issues")"
SEED_ISSUE_NUMBER="$(printf '%s' "$SEED_ISSUE" | grep -o '"number":[0-9]*' | head -n 1 | cut -d: -f2)"
curl -sf -X POST -H "Authorization: token $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"integration seed comment"}' \
  "$API_URL/repos/$REPOSITORY/issues/$SEED_ISSUE_NUMBER/comments" >/dev/null

# 8. Write the credentials used by the tests.
cat >"$CREDENTIALS_FILE" <<EOF
{
  "apiUrl": "$API_URL",
  "username": "$BOT_USERNAME",
  "token": "$BOT_TOKEN",
  "repository": "$REPOSITORY",
  "adminUsername": "$ADMIN_USERNAME",
  "adminToken": "$ADMIN_TOKEN",
  "seedIssueNumber": $SEED_ISSUE_NUMBER,
  "headSha": "$HEAD_SHA",
  "headBranch": "feature/change",
  "baseBranch": "main",
  "inlinePosition": 5
}
EOF

echo "Integration instance ready: $API_URL"
echo "Credentials written to $CREDENTIALS_FILE"
