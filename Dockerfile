FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY chatgpt-mcp-server.js ./
COPY chatgpt-openapi-spec.yaml ./

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "chatgpt-mcp-server.js"]
