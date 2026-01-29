FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create storage directories
RUN mkdir -p storage/payslips storage/reports logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S payrollhr -u 1001

# Change ownership
RUN chown -R payrollhr:nodejs /app

USER payrollhr

EXPOSE 3009

CMD ["npm", "start"]