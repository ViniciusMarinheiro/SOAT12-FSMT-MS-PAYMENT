# Dockerfile para P&S Tech - Payment Service (NestJS + Mercado Pago)

# ================================
# Stage 1: Build
# ================================
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação com SWC
RUN npm run build

# Limpar dependências de desenvolvimento
RUN npm ci --production && npm cache clean --force

# ================================
# Stage 2: Production
# ================================
FROM node:22-alpine AS production

# Instalar dependências do sistema necessárias
RUN apk update && apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

# Copiar arquivos do stage de build
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

# Definir variáveis de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3001

# Expor a porta
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["node", "dist/src/main.js"]
