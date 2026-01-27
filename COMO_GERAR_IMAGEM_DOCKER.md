# Como Gerar uma Imagem Docker

Este guia explica como gerar (build) uma imagem Docker do projeto Hyperlane Warp UI.

## 🚀 Build Local (Desenvolvimento/Teste)

### Build Básico

```bash
# Na raiz do projeto
docker build -t hyperlane-warp-ui .
```

Isso criará uma imagem com a tag `hyperlane-warp-ui:latest`.

### Build com Tag Específica

```bash
# Com versão específica
docker build -t hyperlane-warp-ui:v1.0.0 .

# Com múltiplas tags
docker build -t hyperlane-warp-ui:latest -t hyperlane-warp-ui:v1.0.0 .
```

### Build Sem Cache (Força Rebuild Completo)

```bash
# Útil quando você quer garantir que tudo seja reconstruído
docker build --no-cache -t hyperlane-warp-ui .
```

### Build com Progresso Detalhado

```bash
# Mostra progresso detalhado do build
docker build --progress=plain -t hyperlane-warp-ui .
```

## 🏷️ Nomenclatura de Imagens

### Formato Recomendado

```bash
# Formato: [registry/]nome-do-projeto[:tag]
docker build -t hyperlane-warp-ui:latest .
docker build -t hyperlane-warp-ui:v1.0.0 .
docker build -t seu-registry/hyperlane-warp-ui:latest .
```

### Exemplos

```bash
# Imagem local simples
docker build -t hyperlane-warp-ui .

# Com versão
docker build -t hyperlane-warp-ui:12.1.0 .

# Para Docker Hub
docker build -t seu-usuario/hyperlane-warp-ui:latest .

# Para registry privado
docker build -t registry.exemplo.com/hyperlane-warp-ui:latest .
```

## 📦 Build para Produção

### Build Otimizado

```bash
# Build com todas as otimizações
docker build \
  --tag hyperlane-warp-ui:latest \
  --tag hyperlane-warp-ui:production \
  --file Dockerfile \
  .
```

### Build com Build Args (Se Necessário)

```bash
# Se o Dockerfile usar ARG, você pode passar valores
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  -t hyperlane-warp-ui:latest \
  .
```

## 🔍 Verificar Imagem Gerada

### Listar Imagens

```bash
# Ver todas as imagens
docker images

# Filtrar por nome
docker images | grep hyperlane-warp-ui
```

### Inspecionar Imagem

```bash
# Ver detalhes da imagem
docker inspect hyperlane-warp-ui:latest

# Ver histórico de layers
docker history hyperlane-warp-ui:latest
```

### Ver Tamanho da Imagem

```bash
# Listar imagens com tamanhos
docker images hyperlane-warp-ui
```

## 🧪 Testar Imagem Localmente

### Rodar Container

```bash
# Rodar na porta 3000
docker run -p 3000:3000 hyperlane-warp-ui:latest

# Com variáveis de ambiente
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  -e NODE_ENV=production \
  hyperlane-warp-ui:latest

# Em background (detached)
docker run -d -p 3000:3000 --name hyperlane-warp-ui hyperlane-warp-ui:latest
```

### Ver Logs

```bash
# Ver logs do container
docker logs hyperlane-warp-ui

# Seguir logs em tempo real
docker logs -f hyperlane-warp-ui
```

### Parar Container

```bash
# Parar container
docker stop hyperlane-warp-ui

# Remover container
docker rm hyperlane-warp-ui
```

## 📤 Push para Registry

### Docker Hub

```bash
# 1. Fazer login
docker login

# 2. Tag da imagem (se necessário)
docker tag hyperlane-warp-ui:latest seu-usuario/hyperlane-warp-ui:latest

# 3. Push
docker push seu-usuario/hyperlane-warp-ui:latest
```

### Registry Privado

```bash
# 1. Fazer login no registry
docker login registry.exemplo.com

# 2. Tag da imagem
docker tag hyperlane-warp-ui:latest registry.exemplo.com/hyperlane-warp-ui:latest

# 3. Push
docker push registry.exemplo.com/hyperlane-warp-ui:latest
```

### GitHub Container Registry (ghcr.io)

```bash
# 1. Fazer login
echo $GITHUB_TOKEN | docker login ghcr.io -u seu-usuario --password-stdin

# 2. Tag da imagem
docker tag hyperlane-warp-ui:latest ghcr.io/seu-usuario/hyperlane-warp-ui:latest

# 3. Push
docker push ghcr.io/seu-usuario/hyperlane-warp-ui:latest
```

## 🔧 Comandos Úteis

### Limpar Imagens

```bash
# Remover imagem específica
docker rmi hyperlane-warp-ui:latest

# Remover imagens não utilizadas
docker image prune

# Remover todas as imagens não utilizadas (incluindo com tags)
docker image prune -a
```

### Build com Docker Compose

```bash
# Build usando docker-compose
docker-compose build

# Build forçando rebuild
docker-compose build --no-cache

# Build e rodar
docker-compose up --build
```

### Verificar Build Context

```bash
# Ver o que será enviado para o Docker (útil para debug)
docker build --progress=plain --no-cache -t hyperlane-warp-ui . 2>&1 | grep "transferring context"
```

## ⚙️ Otimizações de Build

### Build Paralelo (Multi-stage)

O Dockerfile já usa multi-stage build, que é otimizado. Mas você pode:

```bash
# Usar BuildKit (mais rápido)
DOCKER_BUILDKIT=1 docker build -t hyperlane-warp-ui .

# Ou habilitar permanentemente
export DOCKER_BUILDKIT=1
docker build -t hyperlane-warp-ui .
```

### Cache de Build

```bash
# Build usando cache (padrão)
docker build -t hyperlane-warp-ui .

# Build sem cache (força rebuild completo)
docker build --no-cache -t hyperlane-warp-ui .
```

## 🐛 Troubleshooting

### Build Falha por Memória

Se o build falhar por falta de memória:

```bash
# Aumente a memória disponível para Docker
# No Docker Desktop: Settings → Resources → Memory
# Ou use uma máquina com mais RAM
```

### Build Muito Lento

```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker build -t hyperlane-warp-ui .

# Ou aumente recursos do Docker
# No Docker Desktop: Settings → Resources
```

### Erro "No space left on device"

```bash
# Limpe espaço
docker system prune -a

# Ou aumente espaço do Docker
# No Docker Desktop: Settings → Resources → Disk image size
```

## 📝 Exemplo Completo

```bash
# 1. Build da imagem
docker build -t hyperlane-warp-ui:latest .

# 2. Verificar imagem
docker images | grep hyperlane-warp-ui

# 3. Testar localmente
docker run -d -p 3000:3000 --name hyperlane-warp-ui hyperlane-warp-ui:latest

# 4. Verificar se está rodando
curl http://localhost:3000

# 5. Ver logs
docker logs hyperlane-warp-ui

# 6. Parar e remover
docker stop hyperlane-warp-ui
docker rm hyperlane-warp-ui

# 7. (Opcional) Push para registry
docker tag hyperlane-warp-ui:latest seu-usuario/hyperlane-warp-ui:latest
docker push seu-usuario/hyperlane-warp-ui:latest
```

## 🎯 Para EasyPanel

Se você está usando EasyPanel, geralmente não precisa fazer build manual. O EasyPanel faz o build automaticamente quando você faz push para o repositório Git.

Mas se quiser fazer build manual e push:

```bash
# 1. Build
docker build -t seu-registry/hyperlane-warp-ui:latest .

# 2. Push
docker push seu-registry/hyperlane-warp-ui:latest

# 3. No EasyPanel, configure para usar a imagem do registry
```

## ✅ Checklist

- [ ] Docker instalado e rodando
- [ ] Dockerfile na raiz do projeto
- [ ] Build executado com sucesso
- [ ] Imagem listada em `docker images`
- [ ] Container testado localmente (se necessário)
- [ ] Imagem enviada para registry (se necessário)
