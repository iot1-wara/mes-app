# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ .

RUN npm run build

# Stage 2: Backend production
FROM node:20-alpine AS backend

WORKDIR /app

# Copy workspace-level package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps needed for nest build)
RUN npm ci

# Copy frontend built assets into backend's dist directory structure
COPY --from=frontend-builder /app/frontend/dist ./dist/public

# Copy source and NestJS config files
COPY tsconfig.json tsconfig.build.json ./
COPY nest-cli.json ./
COPY src/ ./src/

# Build NestJS application
RUN npx nest build

# Install production dependencies only and clean build artifacts
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf node_modules/.cache

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_USERNAME=mes_admin
ENV DB_DATABASE=mes_production
ENV DB_PASSWORD=${DB_PASSWORD:-change_me_in_production}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
