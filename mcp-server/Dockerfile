# Use Node.js 24 Alpine as base image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (though MCP typically uses stdio, this is for potential future HTTP transport)
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"] 