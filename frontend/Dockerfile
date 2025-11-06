# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Accept build argument for API URL (defaults to /api for production)
ARG VITE_API_URL=/api

# Set as environment variable so Vite can access it during build
ENV VITE_API_URL=$VITE_API_URL

# Build
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve globally with npm (simpler than pnpm for single package)
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Start server
CMD ["serve", "-s", "dist", "-l", "5173"]
