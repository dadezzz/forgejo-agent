FROM docker.io/library/node:26.3.0-alpine@sha256:3ad34ca6292aec4a91d8ddeb9229e29d9c2f689efd0dd242860889ac71842eba

RUN apk add --no-cache git

# renovate: datasource=npm depName=pnpm versioning=npm
ENV PNPM_VERSION="11.6.0"

RUN --mount=type=cache,sharing=locked,target=/root/.npm npm install -g "pnpm@$PNPM_VERSION"

ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="/usr/local/pnpm/bin:$PATH"

RUN pnpm config set store-dir /usr/local/pnpm/store
