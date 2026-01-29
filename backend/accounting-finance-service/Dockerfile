FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create necessary directories
RUN mkdir -p logs storage/documents

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S accounting -u 1001

# Change ownership
RUN chown -R accounting:nodejs /app

USER accounting

EXPOSE 3009

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/utils/healthcheck.js

CMD ["node", "src/server.js"]