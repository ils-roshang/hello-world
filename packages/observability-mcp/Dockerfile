############################
# Stage 1 — Builder
############################
FROM node:20-slim AS builder

WORKDIR /usr/src/app

COPY . .

# Install deps without running prepare scripts
RUN npm install --ignore-scripts

# Build observability MCP
RUN npm run build -w @google-cloud/observability-mcp

############################
# Stage 2 — Runtime
############################
FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV MCP_TRANSPORT=http

WORKDIR /usr/src/app

# Copy built app
COPY --from=builder /usr/src/app ./

# Install only prod deps
RUN npm install --omit=dev --ignore-scripts

WORKDIR /usr/src/app/packages/observability-mcp

EXPOSE 8080

CMD ["node", "dist/bundle.js"]
