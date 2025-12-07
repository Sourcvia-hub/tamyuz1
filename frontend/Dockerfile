# Production Frontend Dockerfile
# Multi-stage build: Build React app with backend URL, then serve with nginx

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Build argument for backend URL (REQUIRED)
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Verify backend URL is set
RUN if [ -z "$REACT_APP_BACKEND_URL" ]; then \
      echo "ERROR: REACT_APP_BACKEND_URL is required!"; \
      echo "Build with: docker build --build-arg REACT_APP_BACKEND_URL=https://your-domain.com"; \
      exit 1; \
    fi && \
    echo "Building with REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL"

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --network-timeout 100000

# Copy source code
COPY . .

# Build the application with backend URL
RUN yarn build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
