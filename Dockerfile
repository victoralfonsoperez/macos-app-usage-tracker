# Multi-stage build for macOS App Usage Tracker
# Note: This Dockerfile is designed for development/testing purposes
# The app requires macOS-specific features (AppleScript) that won't work in Linux containers

FROM node:18.20.4-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Create a user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port for web interface (if we add one)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Default command - will show warning about macOS requirement
CMD ["npm", "start"]