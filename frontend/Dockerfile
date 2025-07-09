# Frontend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
RUN npm ci --only=production

# Development stage
FROM base AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nginx -u 1001

# Change ownership of nginx files
RUN chown -R nginx:nodejs /usr/share/nginx/html
RUN chown -R nginx:nodejs /var/cache/nginx
RUN chown -R nginx:nodejs /var/log/nginx
RUN chown -R nginx:nodejs /etc/nginx/conf.d

# Create pid file directory
RUN mkdir -p /var/run/nginx
RUN chown -R nginx:nodejs /var/run/nginx

# Switch to non-root user
USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]