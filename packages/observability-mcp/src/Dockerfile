# Use the official Node.js image as the builder.
FROM node:20-slim AS builder

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy the entire workspace to get the root package.json and packages
COPY . .

# Install dependencies for the whole workspace
RUN npm install

# Build the specific package
RUN npm run build -w @google-cloud/observability-mcp

# Use a smaller image for the runtime.
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy root dependency manifests
COPY package*.json ./

# Copy the specific package's manifest
COPY packages/observability-mcp/package*.json ./packages/observability-mcp/

# Install ONLY production dependencies for the workspace
RUN npm install --omit=dev --workspace=@google-cloud/observability-mcp

# Copy the built bundle from the builder stage
COPY --from=builder /usr/src/app/packages/observability-mcp/dist ./packages/observability-mcp/dist

# Set the working directory to the package
WORKDIR /usr/src/app/packages/observability-mcp

# Run the web service on container startup.
CMD [ "npm", "start" ]
