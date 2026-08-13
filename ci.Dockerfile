FROM docker.io/library/node:26.7.0-alpine@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019

RUN apk add --no-cache curl git

# renovate: datasource=npm depName=pnpm versioning=npm
ENV PNPM_VERSION="11.21.0"

RUN --mount=type=cache,sharing=locked,target=/root/.npm npm install -g "pnpm@$PNPM_VERSION"

ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="/usr/local/pnpm/bin:$PATH"

RUN pnpm config set store-dir /usr/local/pnpm/store
