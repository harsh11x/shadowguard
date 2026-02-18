# Frontend Dockerfile - Multi-stage build
# Stage 1: Build React App
FROM node:20-slim AS build

WORKDIR /app/web/frontend

# Copy frontend package files
COPY web/frontend/package*.json ./
RUN npm install

# Copy frontend source
COPY web/frontend/ ./
# Copy necessary parent configs if any (none found but just in case)
COPY .env.template ../../

# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy build output to Nginx html directory
COPY --from=build /app/web/frontend/dist /usr/share/nginx/html

# Copy Nginx config
COPY web/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
