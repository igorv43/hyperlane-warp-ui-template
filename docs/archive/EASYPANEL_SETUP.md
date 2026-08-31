# Configuração EasyPanel - Hyperlane Warp UI

Este documento contém instruções para configurar o projeto no EasyPanel.

## 📋 Pré-requisitos

- Conta no EasyPanel
- Repositório Git com o código do projeto
- Acesso ao repositório configurado no EasyPanel

## 🚀 Passos para Deploy

### 1. Conectar Repositório

1. No EasyPanel, crie um novo projeto
2. Conecte seu repositório Git
3. Selecione o branch principal (geralmente `main` ou `master`)

### 2. Configurar Build

1. **Tipo de Build**: Selecione **"Dockerfile"** ou **"Docker"**
2. **Dockerfile Path**: Deixe em branco (padrão: `./Dockerfile`) ou especifique `Dockerfile`
3. **Context**: Deixe em branco (padrão: `.`) ou especifique `.`

### 3. Configurar Recursos

**Durante o Build:**
- **Memória**: Mínimo **4GB** (recomendado: 6GB)
- **CPU**: Mínimo **2 cores** (recomendado: 4 cores)

**Durante o Runtime:**
- **Memória**: Mínimo **1GB** (recomendado: 2GB)
- **CPU**: Mínimo **1 core** (recomendado: 2 cores)

### 4. Configurar Porta

- **Porta do Container**: `3000`
- **Protocolo**: `HTTP`

### 5. Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no EasyPanel:

**Obrigatórias:**
```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Opcionais (mas recomendadas):**
```env
NEXT_PUBLIC_WALLET_CONNECT_ID=seu-project-id
NEXT_PUBLIC_REGISTRY_URL=https://registry.example.com
SENTRY_AUTH_TOKEN=seu-sentry-token
```

### 6. Health Check

O EasyPanel deve detectar automaticamente o health check configurado no Dockerfile:
- **Path**: `/api/health`
- **Interval**: 30s
- **Timeout**: 3s
- **Start Period**: 40s
- **Retries**: 3

Se necessário, configure manualmente no EasyPanel:
- **Health Check Path**: `/api/health`
- **Health Check Port**: `3000`

### 7. Deploy

1. Clique em **"Deploy"** ou **"Save & Deploy"**
2. Aguarde o build completar (pode levar 5-15 minutos dependendo dos recursos)
3. Verifique os logs para garantir que não há erros

## 🔍 Verificação Pós-Deploy

1. **Verificar Health Check**: Acesse `https://seu-dominio.com/api/health`
   - Deve retornar: `{"status":"ok","timestamp":"...","uptime":...}`

2. **Verificar Aplicação**: Acesse `https://seu-dominio.com`
   - A aplicação deve carregar normalmente

3. **Verificar Logs**: No EasyPanel, verifique os logs do container
   - Não deve haver erros críticos
   - Deve mostrar: `Ready on http://0.0.0.0:3000`

## 🐛 Troubleshooting

### Build falha por memória

**Sintoma**: Build falha com erro de memória

**Solução**:
1. Aumente a memória disponível para o build no EasyPanel (mínimo 6GB)
2. Ou edite o Dockerfile e aumente `NODE_OPTIONS="--max-old-space-size=6144"`

### Erro "server.js not found"

**Sintoma**: Container inicia mas falha com erro sobre server.js

**Solução**:
1. Verifique se `next.config.js` tem `output: 'standalone'` (já está configurado)
2. Verifique os logs do build para garantir que o build foi bem-sucedido
3. Verifique se o caminho no Dockerfile está correto: `CMD ["node", "server.js"]`

### Health Check falha

**Sintoma**: Health check retorna erro

**Solução**:
1. Verifique se o endpoint `/api/health` está acessível
2. Verifique se a porta 3000 está configurada corretamente
3. Verifique os logs do container para erros

### Porta não acessível

**Sintoma**: Aplicação não responde

**Solução**:
1. Verifique se a porta 3000 está mapeada corretamente no EasyPanel
2. Verifique se o container está rodando: `docker ps` (se tiver acesso SSH)
3. Verifique os logs do container

## 📊 Arquivos Importantes

- `Dockerfile` - Configuração do build Docker
- `.dockerignore` - Arquivos ignorados no build
- `easypanel.yml` - Referência de configuração (pode não ser usado diretamente pelo EasyPanel)
- `next.config.js` - Configuração do Next.js (já otimizado)
- `src/pages/api/health.ts` - Endpoint de health check

## ✅ Checklist de Deploy

- [ ] Repositório conectado no EasyPanel
- [ ] Tipo de build configurado como "Dockerfile"
- [ ] Recursos de build configurados (mínimo 4GB RAM, 2 CPU)
- [ ] Porta 3000 configurada
- [ ] Variáveis de ambiente configuradas
- [ ] Health check configurado
- [ ] Deploy iniciado
- [ ] Build completado com sucesso
- [ ] Health check funcionando
- [ ] Aplicação acessível

## 📝 Notas Adicionais

- O build pode levar 5-15 minutos dependendo dos recursos disponíveis
- A imagem final será aproximadamente 200-300MB (graças ao standalone output)
- O container roda como usuário não-root para maior segurança
- O health check é executado automaticamente a cada 30 segundos
