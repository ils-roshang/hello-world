FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY server.js ./

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
