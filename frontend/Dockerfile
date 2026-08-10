# Multi-stage Frontend Dockerfile (Vite + React 18)
# Stage 1: Build Application
FROM node:20-alpine AS builder

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build for production
COPY . .
RUN npm run build

# Stage 2: Serve Bundle with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
