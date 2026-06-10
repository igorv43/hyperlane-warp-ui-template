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
# Aumentado para 6144 (6GB) para evitar falhas durante "Collecting page data"
# Ajuste conforme necessário (4096 = 4GB, 6144 = 6GB, 8192 = 8GB)
ENV NODE_OPTIONS="--max-old-space-size=6144"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Desabilitar source maps para acelerar build (opcional, mas reduz tempo)
ENV NEXT_PRIVATE_STANDALONE=true

# ─────────────────────────────────────────────────────────────────────────────
# Build-time public config (NEXT_PUBLIC_*)
# Next.js INLINA essas variáveis no bundle durante `next build` — elas NÃO são
# lidas em runtime. Por isso devem ser passadas no BUILD, via --build-arg ou pela
# aba "Build Arguments" do EasyPanel. Args não informados (vazios) caem no .env.
# ─────────────────────────────────────────────────────────────────────────────
ARG NEXT_PUBLIC_REGISTRY_URL=
ARG NEXT_PUBLIC_REGISTRY_BRANCH=
ARG NEXT_PUBLIC_GITHUB_PROXY=
ARG NEXT_PUBLIC_WALLET_CONNECT_ID=
ARG NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS=
ARG NEXT_PUBLIC_RPC_OVERRIDES=
ARG NEXT_PUBLIC_TRANSFER_BLACKLIST=
ARG NEXT_PUBLIC_CHAIN_WALLET_WHITELISTS=
ARG NEXT_PUBLIC_VERSION=
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_REFINER_PROJECT_ID=
ARG NEXT_PUBLIC_REFINER_TRANSFER_FORM_ID=

# Copiar dependências da stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte (inclui o .env commitado, que serve de fallback)
COPY . .

# Gravar SOMENTE os build args informados (não-vazios) em .env.local, que tem
# precedência sobre .env no Next. Args vazios são ignorados, preservando os
# defaults do .env. (.env.local é criado aqui dentro; o host é dockerignored.)
RUN : > .env.local && \
    for v in NEXT_PUBLIC_REGISTRY_URL NEXT_PUBLIC_REGISTRY_BRANCH NEXT_PUBLIC_GITHUB_PROXY \
             NEXT_PUBLIC_WALLET_CONNECT_ID NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS \
             NEXT_PUBLIC_RPC_OVERRIDES NEXT_PUBLIC_TRANSFER_BLACKLIST \
             NEXT_PUBLIC_CHAIN_WALLET_WHITELISTS NEXT_PUBLIC_VERSION \
             NEXT_PUBLIC_SENTRY_DSN NEXT_PUBLIC_REFINER_PROJECT_ID \
             NEXT_PUBLIC_REFINER_TRANSFER_FORM_ID; do \
      eval "val=\$$v"; \
      if [ -n "$val" ]; then echo "$v=$val" >> .env.local; fi; \
    done && \
    echo "==== .env.local (build-arg overrides) ====" && cat .env.local && echo "==========================================="

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

# Copiar script de inicialização do stage builder (já foi copiado lá com COPY . .)
COPY --from=builder --chown=nextjs:nodejs /app/start-server.sh ./
RUN chmod +x start-server.sh

# Mudar para usuário não-root
USER nextjs

# Expor porta (EasyPanel usa esta porta)
EXPOSE 3000

# Variáveis de ambiente para produção
# PORT pode ser sobrescrito pelo EasyPanel (geralmente 80 ou 3000)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck para EasyPanel monitorar a aplicação
# Verifica se o servidor está respondendo na porta configurada
# Aumentado start-period para dar mais tempo para a aplicação iniciar
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/ || exit 1

# Usar script de inicialização para garantir que variáveis de ambiente sejam aplicadas
CMD ["./start-server.sh"]
