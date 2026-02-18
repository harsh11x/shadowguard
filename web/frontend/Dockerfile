# Frontend Dockerfile - Multi-stage build
FROM node:20-slim AS build

WORKDIR /app/web/frontend

# Copy package files
COPY web/frontend/package*.json ./
RUN npm install

# Copy source
COPY web/frontend/ ./
# Blank .env if needed for build-time resolution
RUN touch .env

# Build the app
RUN npm run build

# Final stage
FROM nginx:alpine
COPY --from=build /app/web/frontend/dist /usr/share/nginx/html
COPY web/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
