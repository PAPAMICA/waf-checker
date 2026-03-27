# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build --if-present

# ─── Stage 2: Runner (final image) ───────────────────────────────────────────
# node:22-slim (Debian) instead of Alpine: workerd binary requires glibc
FROM node:22-slim

# Apply security patches + install runtime dependencies:
# - dumb-init: PID 1 process manager for correct SIGTERM handling in Kubernetes
# - wget: used by the HEALTHCHECK to ping the HTTP endpoint
# - ca-certificates: required by workerd for HTTPS calls to GitHub (payload fetch)
RUN apt-get update && apt-get upgrade -y --no-install-recommends && \
    apt-get install -y --no-install-recommends \
      dumb-init \
      wget \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated non-root user with fixed UID/GID 1001
# -m creates the home directory /home/appuser
# wrangler writes logs to ~/.config/.wrangler/ so the home dir is required
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /bin/sh appuser

WORKDIR /app
COPY --chown=appuser:appgroup package*.json ./

# npm ci runs here (not copied from builder) to ensure platform-native workerd binary
# --include=optional ensures workerd is downloaded as an optional dependency
# wrangler@latest fixes the mkdtemp bug present in the bundled 4.42.0
RUN npm ci --frozen-lockfile --include=optional && \
    npm install wrangler@latest && \
    mkdir -p /app/.wrangler-tmp && \
    chown -R appuser:appgroup /app

# Copy only what is needed at runtime from the builder stage
COPY --from=builder --chown=appuser:appgroup /app/app ./app
COPY --chown=appuser:appgroup wrangler.toml .

# wrangler needs HOME to locate ~/.config/.wrangler/
ENV HOME=/home/appuser
# Disable telemetry
ENV WRANGLER_SEND_METRICS=false
# Prevent wrangler from opening a browser tab
ENV BROWSER=none
# Use /app/.wrangler-tmp instead of /tmp to avoid noexec mount issues in Docker Desktop
ENV TMPDIR=/app/.wrangler-tmp

USER appuser
EXPOSE 8787

# Check every 30s that the server is responding
# start-period gives wrangler 20s to boot before health checks begin
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8787/ || exit 1

# dumb-init as PID 1 for correct signal handling in Kubernetes
ENTRYPOINT ["dumb-init", "--"]
# --ip 0.0.0.0: required to be reachable outside the container (default is 127.0.0.1)
# --local: runs without Cloudflare authentication
CMD ["npx", "wrangler", "dev", "--ip", "0.0.0.0", "--port", "8787", "--local"]
