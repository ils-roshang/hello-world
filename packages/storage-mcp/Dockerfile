# -------- Build Stage --------
FROM node:20-slim AS build

WORKDIR /app

# Copy only workspace package
COPY packages/storage-mcp ./packages/storage-mcp

WORKDIR /app/packages/storage-mcp

# Install dependencies
RUN npm install

# Compile TypeScript (NO bundling)
RUN npm run build

# -------- Production Stage --------
FROM node:20-slim

WORKDIR /app

# Copy compiled output
COPY --from=build /app/packages/storage-mcp/package.json ./
COPY --from=build /app/packages/storage-mcp/dist ./dist
COPY --from=build /app/packages/storage-mcp/node_modules ./node_modules

# Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Start compiled JS (NOT bundle.js)
CMD ["node", "dist/src/index.js"]
