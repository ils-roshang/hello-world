# ===============================
# Stage 1 — Build
# ===============================
FROM node:20-slim AS build

WORKDIR /app

# Increase memory for TypeScript (safe)
ENV NODE_OPTIONS=--max-old-space-size=4096

# Copy entire monorepo (tsconfig extends require this)
COPY . .

# Install dependencies (root workspace install)
RUN npm install

# Build ONLY storage-mcp (bypass turbo)
WORKDIR /app/packages/storage-mcp
RUN npx tsc


# ===============================
# Stage 2 — Production
# ===============================
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy compiled output
COPY --from=build /app/packages/storage-mcp/dist ./dist

# Copy package.json (for metadata)
COPY --from=build /app/packages/storage-mcp/package.json ./

# Copy only production node_modules
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8080

# Run compiled CommonJS entry
CMD ["node", "dist/index.js"]
