# --- Build stage ---
  FROM node:22-alpine AS builder
  WORKDIR /app
  RUN apk add --no-cache bash curl
  COPY package*.json ./
  RUN npm ci --no-audit --no-fund
  COPY . .
  # This runs your project's build (client+server). If you don't have a build script, change this to just copy sources.
  RUN npm run build
  
  # --- Runtime stage ---
  FROM node:22-alpine
  WORKDIR /app
  RUN apk add --no-cache curl dumb-init postgresql-client bash
  ENV NODE_ENV=production
  ENV PORT=5000
  ENV HOST=0.0.0.0
  
  COPY package*.json ./
  RUN npm ci --omit=dev --no-audit --no-fund
  
  # bring compiled output
  COPY --from=builder /app/dist ./dist
  
  # entrypoint
  COPY docker-entrypoint.sh /docker-entrypoint.sh
  RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
  
  EXPOSE 5000
  HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:5000/health || curl -fsS http://127.0.0.1:5000/api/health || exit 1
  
  ENTRYPOINT ["dumb-init","--","/docker-entrypoint.sh"]