# Multi-stage build for optimized image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create directory for Firebase service account
RUN mkdir -p Firebase

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {let data = ''; r.on('data', (chunk) => {data += chunk;}); r.on('end', () => {const response = JSON.parse(data); process.exit(response.status === 'OK' ? 0 : 1);});})"

# Start application
CMD ["node", "src/index.js"]
