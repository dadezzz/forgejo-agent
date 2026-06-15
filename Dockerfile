FROM git.zarantonello.dev/davide/forgejo-agent:ci AS builder

WORKDIR /srv

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,sharing=locked,target=/root/.local/share/pnpm/store pnpm install

COPY . ./
RUN pnpm run build

FROM docker.io/library/node:26.3.0-alpine@sha256:3ad34ca6292aec4a91d8ddeb9229e29d9c2f689efd0dd242860889ac71842eba

RUN apk add --no-cache git

COPY entrypoint.sh /srv/entrypoint.sh
COPY --from=builder /srv/dist /srv/dist

ENTRYPOINT ["/srv/entrypoint.sh"]
