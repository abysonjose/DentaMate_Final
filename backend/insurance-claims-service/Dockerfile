FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create storage directory
RUN mkdir -p ./storage/documents

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S insurance-claims -u 1001

# Change ownership
RUN chown -R insurance-claims:nodejs /app
USER insurance-claims

# Expose port
EXPOSE 3009

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/health-check.js

CMD ["npm", "start"]