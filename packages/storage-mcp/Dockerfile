# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy root workspace files if needed, but since we are specifically in a package, 
# we try to be self-contained or copy what's necessary.
# For simplicity, we assume we are building from the root of the repo OR 
# we copy the specific package if it's independent enough.
# In gcloud-mcp repo, it's a turborepo/monorepo.

COPY package.json ./
COPY turbo.json ./
COPY tsconfig.json ./
COPY packages/storage-mcp/package.json ./packages/storage-mcp/
COPY packages/storage-mcp/tsconfig.json ./packages/storage-mcp/
COPY packages/storage-mcp/build.js ./packages/storage-mcp/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/storage-mcp/src ./packages/storage-mcp/src

# Build the package
RUN npm run build --workspace=@google-cloud/storage-mcp

# Production stage
FROM node:20-slim

WORKDIR /app

COPY --from=build /app/packages/storage-mcp/package.json ./
COPY --from=build /app/packages/storage-mcp/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Cloud Run defaults to port 8080
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/bundle.js"]
