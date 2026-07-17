FROM docker.io/library/node:26.5.0-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66

RUN apk add --no-cache curl git

# renovate: datasource=npm depName=pnpm versioning=npm
ENV PNPM_VERSION="11.13.0"

RUN --mount=type=cache,sharing=locked,target=/root/.npm npm install -g "pnpm@$PNPM_VERSION"

ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="/usr/local/pnpm/bin:$PATH"

RUN pnpm config set store-dir /usr/local/pnpm/store
