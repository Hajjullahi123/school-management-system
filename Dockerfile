# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.19.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"
LABEL build_version="2026.09.21.1"

# Node.js app lives here
WORKDIR /app

# Prevent interactive prompts during apt package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies including openssl and Chromium for Puppeteer
RUN apt-get -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false update --allow-insecure-repositories --allow-unauthenticated || true && \
    apt-get install -y --allow-unauthenticated --no-install-recommends \
    openssl ca-certificates chromium \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_CACHE_DIR="/app/.puppeteer-cache"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Ensure devDependencies are installed during build stage
ENV NODE_ENV=development

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

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
