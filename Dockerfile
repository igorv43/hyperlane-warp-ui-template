# Multi-stage build para otimizar tamanho final da imagem
# Baseado no template oficial do Next.js para Docker
# Otimizado para EasyPanel

FROM node:24-alpine AS base

# Labels para identificação
LABEL maintainer="Hyperlane Warp UI"
LABEL description="Hyperlane Warp UI Template - Next.js Application"

# Instalar dependências necessárias para compilação
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
# Instalar pnpm via corepack (já incluído no Node.js 24+)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml* ./
# Copiar patches (necessário para pnpm install com patchedDependencies)
COPY patches ./patches
# Instalar apenas dependências de produção se necessário
# Para build, precisamos de devDependencies também
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

# Variável de ambiente para limitar memória durante build
# Ajuste conforme necessário (4096 = 4GB, 6144 = 6GB)
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copiar dependências da stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Build da aplicação
# O next.config.js já está configurado com output: 'standalone'
# e otimizações de memória
RUN pnpm run build

# Stage 3: Runner (produção)
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos necessários para produção (standalone output)
# O modo standalone já inclui apenas o necessário
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar standalone build
# O standalone output coloca tudo na raiz do .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Mudar para usuário não-root
USER nextjs

# Expor porta (EasyPanel usa esta porta)
EXPOSE 4091

# Variáveis de ambiente para produção
# PORT pode ser sobrescrito pelo EasyPanel (geralmente 80 ou 3000)
ENV PORT=4091
ENV HOSTNAME="0.0.0.0"

# Healthcheck para EasyPanel monitorar a aplicação
# Verifica se o servidor está respondendo na porta configurada
# Aumentado start-period para dar mais tempo para a aplicação iniciar
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-4091}/ || exit 1

# O standalone cria um server.js na raiz do diretório standalone
CMD ["node", "server.js"]
