# ---------- Build Stage ----------
FROM node:20-slim AS build

WORKDIR /app

# Copy entire repo (needed for monorepo + tsconfig extends)
COPY . .

# Install dependencies (workspace aware)
RUN npm install

# Build only storage-mcp workspace
RUN npm run build --workspace=@google-cloud/storage-mcp


# ---------- Production Stage ----------
FROM node:20-slim

WORKDIR /app

# Copy only required files from build stage
COPY --from=build /app/packages/storage-mcp/package.json ./
COPY --from=build /app/packages/storage-mcp/dist ./dist
COPY --from=build /app/node_modules ./node_modules

ENV PORT=8080
EXPOSE 8080

# IMPORTANT: Run compiled JS, not bundle.js
CMD ["node", "dist/src/index.js"]
