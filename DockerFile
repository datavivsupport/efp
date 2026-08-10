# ---------- Stage 1: build the Vite bundle ----------
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first so this layer caches across source-only changes
COPY package.json package-lock.json ./
RUN npm ci

# Vite inlines env vars at build time, so they must be present now
ARG VITE_API_BASE_URL
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_TENANT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID \
    VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID

COPY . .
RUN npm run build

# ---------- Stage 2: serve the static build ----------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing: unknown paths fall back to index.html (react-router handles them)
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '' \
  '  location /assets/ {' \
  '    expires 1y;' \
  '    add_header Cache-Control "public, immutable";' \
  '  }' \
  '' \
  '  location = /index.html {' \
  '    add_header Cache-Control "no-cache";' \
  '  }' \
  '' \
  '  gzip on;' \
  '  gzip_types text/css application/javascript application/json image/svg+xml;' \
  '  gzip_min_length 1024;' \
  '}' \
  > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
