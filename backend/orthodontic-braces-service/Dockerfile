FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S orthodontic -u 1001

# Change ownership
RUN chown -R orthodontic:nodejs /app

USER orthodontic

EXPOSE 3009

CMD ["npm", "start"]