############################
# Stage 1 — Builder
############################
FROM node:20-slim AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy entire monorepo
COPY . .

# Install dependencies WITHOUT running prepare scripts
RUN npm install --ignore-scripts

# Build only observability MCP package
RUN npm run build -w @google-cloud/observability-mcp

############################
# Stage 2 — Runtime
############################
FROM node:20-slim

# Environment for production
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

# Copy built workspace from builder
COPY --from=builder /usr/src/app ./

# Install only production dependencies without scripts
RUN npm install --omit=dev --ignore-scripts

# Move into observability package
WORKDIR /usr/src/app/packages/observability-mcp

# Expose Cloud Run port
EXPOSE 8080

# Start MCP server
CMD ["node", "dist/bundle.js"]
