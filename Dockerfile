FROM node:18
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port (AppRunner defaults to 8080)
EXPOSE 8080

# Run the AppRunner backend service
CMD ["node", "apprunner-backend.js"]
