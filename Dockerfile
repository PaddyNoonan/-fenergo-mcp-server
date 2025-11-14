FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY chatgpt-openapi-spec.yaml ./
EXPOSE 8080
CMD ["node", "chatgpt-mcp-server.js"]
