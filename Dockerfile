FROM node:20-slim

WORKDIR /app

# Install the storage-mcp package
RUN npm install -g @google-cloud/storage-mcp

# Create a simple HTTP wrapper
COPY server.js .

EXPOSE 8080

CMD ["node", "server.js"]
