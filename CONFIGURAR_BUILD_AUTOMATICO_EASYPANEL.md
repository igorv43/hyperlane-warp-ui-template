# Configurar Build Automático no EasyPanel

Este guia explica como configurar o EasyPanel para fazer build automático usando o Dockerfile.

## 🎯 Objetivo

Configurar o EasyPanel para:
- ✅ Fazer build automaticamente usando o Dockerfile
- ✅ Não tentar fazer pull de imagens
- ✅ Build automático a cada commit/push

## 📋 Passo a Passo no EasyPanel

### 1. Acessar Configurações do Projeto

1. No EasyPanel, vá para seu projeto
2. Clique no serviço/app que você quer configurar
3. Vá em **Settings** (Configurações)

### 2. Configurar Build Method

1. Procure por **"Build"** ou **"Build Method"** ou **"Build Type"**
2. Selecione uma das opções:
   - **"Dockerfile"** ✅ (recomendado)
   - **"Docker"** ✅
   - **"Build from Dockerfile"** ✅
   - **"Custom Dockerfile"** ✅

3. **NÃO selecione:**
   - ❌ "Use existing image"
   - ❌ "Pull image"
   - ❌ "Pre-built image"

### 3. Configurar Dockerfile Path

1. Procure por **"Dockerfile Path"** ou **"Dockerfile"**
2. Configure:
   - **Valor:** `Dockerfile` (ou deixe em branco se estiver na raiz)
   - **Ou:** `./Dockerfile`

3. Se o Dockerfile estiver em outro lugar, especifique o caminho completo

### 4. Configurar Build Context

1. Procure por **"Context"** ou **"Build Context"**
2. Configure:
   - **Valor:** `.` (ponto - diretório raiz)
   - **Ou:** deixe em branco (padrão é `.`)

### 5. Configurar Recursos do Build

1. Procure por **"Build Resources"** ou **"Build Settings"**

2. **Memória durante build:**
   - Mínimo: **6GB**
   - Recomendado: **8GB**

3. **CPU durante build:**
   - Mínimo: **2 cores**
   - Recomendado: **4 cores**

4. **Timeout do build:**
   - Mínimo: **30 minutos**
   - Recomendado: **45 minutos**

### 6. Configurar Variáveis de Ambiente (Se Necessário)

1. Vá em **"Environment Variables"** ou **"Variáveis de Ambiente"**

2. Adicione (se necessário):
   ```
   NODE_ENV=production
   PORT=3000
   HOSTNAME=0.0.0.0
   NEXT_TELEMETRY_DISABLED=1
   ```

### 7. Configurar Porta do Container

1. Vá em **"Network"** ou **"Rede"**
2. Configure:
   - **Container Port:** `3000`
   - **Protocol:** `HTTP`

### 8. Salvar e Fazer Deploy

1. Clique em **"Save"** ou **"Salvar"**
2. Clique em **"Deploy"** ou **"Redeploy"**
3. Aguarde o build completar (pode levar 10-20 minutos)

## ✅ Verificação

### Durante o Build

1. Vá em **"Logs"** ou **"Build Logs"**
2. Você deve ver:
   - `Building with Dockerfile...`
   - `Step 1/XX: FROM node:24-alpine`
   - Progresso do build
   - `Build completed successfully`

### Após o Build

1. Verifique se o container está rodando (status verde)
2. Verifique os logs do container:
   ```
   Starting Next.js server...
   PORT: 3000
   HOSTNAME: 0.0.0.0
   Network: http://0.0.0.0:3000
   ✓ Ready in X.Xs
   ```

## 🔧 Troubleshooting

### Problema: EasyPanel ainda tenta fazer pull

**Solução:**
1. Verifique se selecionou "Dockerfile" e não "Use existing image"
2. Verifique se não há configuração de "Image" ou "Pull image" ativa
3. Remova qualquer configuração de registry/image se houver

### Problema: Build falha

**Solução:**
1. Verifique os logs do build
2. Aumente memória para 8GB
3. Aumente timeout para 45 minutos
4. Verifique se o Dockerfile está na raiz do projeto

### Problema: "Dockerfile not found"

**Solução:**
1. Verifique se o Dockerfile está commitado no Git
2. Verifique o caminho do Dockerfile nas configurações
3. Certifique-se de que o repositório está conectado corretamente

## 📝 Checklist

Antes de fazer deploy, verifique:

- [ ] Build Method está configurado como "Dockerfile"
- [ ] Dockerfile Path está correto (ou em branco se na raiz)
- [ ] Context está configurado como "." (ou em branco)
- [ ] Memória do build: mínimo 6GB
- [ ] CPU do build: mínimo 2 cores
- [ ] Timeout: mínimo 30 minutos
- [ ] Container Port: 3000
- [ ] Variáveis de ambiente configuradas (se necessário)
- [ ] Dockerfile está commitado no Git
- [ ] Repositório está conectado no EasyPanel

## 🎯 Resultado Esperado

Após configurar corretamente:

1. ✅ EasyPanel fará build automaticamente usando o Dockerfile
2. ✅ Build será executado a cada commit/push (se configurado)
3. ✅ Container será iniciado automaticamente após build bem-sucedido
4. ✅ Aplicação estará acessível na porta configurada

## 📞 Próximos Passos

1. **Configure o build** seguindo os passos acima
2. **Faça deploy** e aguarde o build completar
3. **Verifique os logs** para garantir que tudo está funcionando
4. **Teste o acesso** à aplicação

Se tiver problemas, verifique os logs do build e me envie as últimas 50 linhas.
