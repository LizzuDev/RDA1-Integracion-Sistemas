# ==============================================================================
# Dockerfile: Booking Prototipo API Gateway & ESB (RDA2)
# Multi-stage build optimizado para Node.js 22 LTS y NestJS
# ==============================================================================

# ------------------------------------------------------------------------------
# Fase 1: Compilación de la aplicación
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar herramientas necesarias para compilación de dependencias nativas
RUN apk add --no-cache python3 make g++

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalación limpia de dependencias (incluyendo devDependencies para compilar)
RUN npm install

# Copiar el código fuente completo, esquemas y contratos
COPY . .

# Compilar la aplicación NestJS
RUN npm run build

# ------------------------------------------------------------------------------
# Fase 2: Imagen ligera de ejecución en producción
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar manifiestos e instalar exclusivamente dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copiar artefactos compilados desde la fase builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/proto ./src/proto
COPY --from=builder /app/contracts ./contracts

# Crear directorio para almacenamiento de logs físicos rotativos
RUN mkdir -p logs && chown -R node:node logs /app

# Usuario no root por principios de seguridad en contenedores
USER node

# Exposición de puertos:
# - 3000: API Gateway HTTP / REST / BFF GraphQL / Swagger / Health
# - 50051: Servidor gRPC Inbound (InventoryStockService)
EXPOSE 3000 50051

# Comando de arranque de la pasarela
CMD ["node", "dist/main.js"]
