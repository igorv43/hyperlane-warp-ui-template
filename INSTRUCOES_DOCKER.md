# Deploy via Docker - Instruções

## Vantagens do Docker

✅ **Controle total sobre recursos de memória durante build**
✅ **Build isolado e reproduzível**
✅ **Melhor gerenciamento de dependências**
✅ **Standalone output = imagem menor e mais rápida**
✅ **Mais fácil de debugar e fazer troubleshooting**

## Configuração no EasyPanel

No EasyPanel, você pode configurar para usar Docker ao invés de buildpack:

### Opção 1: Dockerfile direto

1. **No EasyPanel, procure por "Build Method" ou "Build Type"**
2. **Selecione "Docker" ou "Dockerfile"**
3. **O EasyPanel vai detectar automaticamente o Dockerfile na raiz**
4. **Configure os recursos disponíveis para o build:**
   - Memória: 4-6GB durante build
   - CPU: 2-4 cores

### Opção 2: Build manual e push

1. **Faça build localmente ou em CI/CD:**
   ```bash
   docker build -t hyperlane-warp-ui .
   ```

2. **Faça push para registry:**
   ```bash
   docker tag hyperlane-warp-ui seu-registry/hyperlane-warp-ui
   docker push seu-registry/hyperlane-warp-ui
   ```

3. **No EasyPanel, configure para usar a imagem do registry**

## Build Local (para testar)

```bash
# Build da imagem
docker build -t hyperlane-warp-ui .

# Rodar localmente
docker run -p 3000:3000 hyperlane-warp-ui

# Ou usar docker-compose
docker-compose up --build
```

## Variáveis de Ambiente

As variáveis de ambiente devem ser configuradas no EasyPanel ou no `docker-compose.yml`.

Exemplos:
- `NEXT_PUBLIC_API_URL`
- `SENTRY_AUTH_TOKEN`
- Outras variáveis específicas da aplicação

## Otimizações do Dockerfile

O Dockerfile foi configurado com:

1. **Multi-stage build**: Reduz tamanho final da imagem
2. **Alpine Linux**: Imagem base menor
3. **Standalone output**: Apenas arquivos necessários
4. **Usuário não-root**: Maior segurança
5. **Memória limitada**: 4GB durante build (pode ajustar se necessário)

## Ajustar Memória do Build

Se precisar mais memória durante o build, edite a linha no Dockerfile:

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"  # Mude para 6144 ou 8192
```

Ou configure no EasyPanel os limites de memória disponíveis para o build.

## Troubleshooting

### Build falha por memória
- Aumente `--max-old-space-size` no Dockerfile
- Aumente limites de memória no EasyPanel

### Imagem muito grande
- Verifique se `.dockerignore` está correto
- O standalone output já reduz bastante o tamanho

### Porta não acessível
- Verifique se a porta está mapeada corretamente
- No EasyPanel, configure a porta 3000

## Vantagens vs Buildpack

| Aspecto | Docker | Buildpack |
|---------|--------|-----------|
| Controle de recursos | ✅ Total | ❌ Limitado |
| Tamanho da imagem | ✅ Otimizado | ⚠️ Pode ser maior |
| Debugging | ✅ Fácil | ⚠️ Mais difícil |
| Reproducibilidade | ✅ Garantida | ⚠️ Depende do buildpack |
| Flexibilidade | ✅ Total | ❌ Limitada |
