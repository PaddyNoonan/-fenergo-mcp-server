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

# Force cache bust - build timestamp
ARG BUILD_DATE=unknown
RUN echo "Build: $BUILD_DATE"

# Run the AppRunner backend service (with OAuth /authenticate endpoint)
CMD ["node", "apprunner-backend.js"]
