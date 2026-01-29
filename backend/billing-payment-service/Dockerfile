FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY templates/ ./templates/

# Create directories
RUN mkdir -p logs storage/invoices

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S billing -u 1001

# Change ownership
RUN chown -R billing:nodejs /app

USER billing

EXPOSE 3007

CMD ["node", "src/server.js"]