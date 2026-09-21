# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.19.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"
LABEL build_version="2026.09.19.2"

# Node.js app lives here
WORKDIR /app

# Prevent interactive prompts during apt package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies including openssl and Puppeteer (Chromium) requirements
RUN apt-get -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false update --allow-insecure-repositories --allow-unauthenticated || true && \
    apt-get install -y --allow-unauthenticated --no-install-recommends \
    openssl ca-certificates \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 \
    && (apt-get install -y --allow-unauthenticated --no-install-recommends libasound2 || apt-get install -y --allow-unauthenticated --no-install-recommends libasound2t64 || true) \
    && (apt-get install -y --allow-unauthenticated --no-install-recommends libcups2 || apt-get install -y --allow-unauthenticated --no-install-recommends libcups2t64 || true) \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_CACHE_DIR="/app/.puppeteer-cache"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Ensure devDependencies are installed during build stage
ENV NODE_ENV=development

# Install packages needed to build node modules
RUN apt-get -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false update --allow-insecure-repositories --allow-unauthenticated || true && \
    apt-get install --allow-unauthenticated --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Build application and remove frontend build-only node_modules to drastically reduce image size
RUN npm run build && \
    rm -rf client/node_modules personal-website/node_modules /root/.npm /root/.cache

# Remove development dependencies
RUN npm prune --omit=dev && \
    npm prune --prefix server --omit=dev


# Final stage for app image
FROM base

# Set production environment for runtime
ENV NODE_ENV="production"

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]
