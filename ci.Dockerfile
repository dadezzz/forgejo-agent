FROM docker.io/library/node:26.5.1-alpine@sha256:233761595746769ebfdb6090f44fc7cdf818ae0ce62d2b37e0367723b9823e36

RUN apk add --no-cache curl git

# renovate: datasource=npm depName=pnpm versioning=npm
ENV PNPM_VERSION="11.18.0"

RUN --mount=type=cache,sharing=locked,target=/root/.npm npm install -g "pnpm@$PNPM_VERSION"

ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="/usr/local/pnpm/bin:$PATH"

RUN pnpm config set store-dir /usr/local/pnpm/store
