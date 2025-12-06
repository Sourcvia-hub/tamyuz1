# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Build argument for backend URL (optional - will use same-origin fallback if not provided)
ARG REACT_APP_BACKEND_URL=""

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
# If REACT_APP_BACKEND_URL is empty, the app will use same-origin fallback via nginx proxy
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
