# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.19.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"
LABEL build_version="2026.09.21.3"

# Node.js app lives here
WORKDIR /app


# Throw-away build stage to reduce size of final image
FROM base AS build

# Ensure devDependencies are installed during build stage
ENV NODE_ENV=development

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
CMD [ "sh", "-c", "npx prisma db push --schema=server/prisma/schema.prisma --skip-generate 2>&1 || echo '[Startup] prisma db push failed, continuing...'; npm run start" ]
