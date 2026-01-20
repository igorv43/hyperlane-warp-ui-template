# Docker Setup para Hyperlane Warp UI

Este projeto está configurado para rodar via Docker, resolvendo problemas de memória durante o build.

## 📦 Arquivos Docker

- `Dockerfile` - Build multi-stage otimizado
- `.dockerignore` - Ignora arquivos desnecessários no build
- `docker-compose.yml` - Para desenvolvimento/teste local

## 🚀 Como usar

### Build Local

```bash
# Build da imagem
docker build -t hyperlane-warp-ui .

# Rodar container
docker run -p 3000:3000 hyperlane-warp-ui
```

### Com Docker Compose

```bash
# Build e rodar
docker-compose up --build

# Rodar em background
docker-compose up -d
```

## 🔧 Configuração no EasyPanel

### Opção 1: Build automático via Dockerfile

1. **Copie os arquivos para o repositório:**
   - `Dockerfile`
   - `.dockerignore`
   - `next.config.js` (já otimizado)

2. **No EasyPanel:**
   - Vá em configurações do projeto
   - Procure por "Build Method" ou "Build Type"
   - Selecione **"Docker"** ou **"Dockerfile"**
   - O EasyPanel detectará automaticamente o Dockerfile

3. **Configure recursos (se disponível):**
   - Memória para build: **4-6GB**
   - CPU: **2-4 cores**

### Opção 2: Build manual e push

```bash
# Build
docker build -t seu-registry/hyperlane-warp-ui:latest .

# Push para registry
docker push seu-registry/hyperlane-warp-ui:latest
```

Depois configure no EasyPanel para usar a imagem do registry.

## ⚙️ Variáveis de Ambiente

Configure no EasyPanel ou no `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=https://api.example.com
  - SENTRY_AUTH_TOKEN=seu-token
  # Adicione outras variáveis necessárias
```

## 🔍 Ajustar Memória do Build

Se o build ainda falhar por memória, edite o Dockerfile:

```dockerfile
# Linha 22 - Aumente o valor
ENV NODE_OPTIONS="--max-old-space-size=6144"  # 6GB
# ou
ENV NODE_OPTIONS="--max-old-space-size=8192"  # 8GB
```

## ✅ Vantagens do Docker

- ✅ **Controle total** sobre recursos de memória
- ✅ **Build isolado** e reproduzível
- ✅ **Standalone output** = imagem menor (~200-300MB)
- ✅ **Mais fácil de debugar** e fazer troubleshooting
- ✅ **Funciona em qualquer ambiente** que suporte Docker

## 🐛 Troubleshooting

### Build falha por memória
- Aumente `--max-old-space-size` no Dockerfile
- Aumente limites de memória no EasyPanel (se disponível)

### Erro "server.js not found"
- Verifique se o `next.config.js` tem `output: 'standalone'`
- O build standalone cria o `server.js` automaticamente

### Porta não acessível
- Verifique se a porta 3000 está mapeada corretamente
- No EasyPanel, configure a porta 3000

### Imagem muito grande
- O `.dockerignore` já filtra arquivos desnecessários
- O standalone output reduz significativamente o tamanho

## 📊 Comparação

| Método | Memória Build | Tamanho Final | Controle |
|--------|---------------|---------------|----------|
| Buildpack | Limitado | Maior | Limitado |
| Docker | Configurável | ~200-300MB | Total |

## 📝 Notas

- O `next.config.js` já está otimizado com `output: 'standalone'`
- As otimizações de memória já estão aplicadas
- O Dockerfile usa multi-stage build para otimizar tamanho
- Usuário não-root para maior segurança
