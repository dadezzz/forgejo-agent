FROM git.zarantonello.dev/infra/forgejo-agent:ci AS builder

WORKDIR /srv

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,sharing=locked,target=/root/.local/share/pnpm/store pnpm install

COPY . ./
RUN pnpm run build

FROM docker.io/library/node:26.3.0-alpine@sha256:9c0e1e52125d6b67d505cf75b4880fcf1290ccea5c480849910e1d57b2cf72b5

RUN apk add --no-cache git

COPY entrypoint.sh /srv/entrypoint.sh
COPY --from=builder /srv/dist /srv/dist

ENTRYPOINT ["/srv/entrypoint.sh"]
