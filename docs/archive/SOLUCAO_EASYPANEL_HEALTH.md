# Solução: Service is not reachable no EasyPanel

Este documento detalha como resolver o erro "Service is not reachable" no EasyPanel.

## 🔍 Diagnóstico

Se você vê "Service is not reachable", significa que:
1. ✅ Container está rodando (log mostra "Ready in Xs")
2. ❌ Health check do EasyPanel está falhando

## ✅ Solução Passo a Passo

### 1. Verificar a Porta do Container

**No EasyPanel:**
1. Vá em **Settings** → **Network**
2. Anote qual **Container Port** está configurada (geralmente `80` ou `3000`)

### 2. Configurar Health Check Manualmente

**No EasyPanel:**
1. Vá em **Settings** → **Health Check**
2. Configure exatamente assim:

```
Health Check Type: HTTP
Health Check Path: /api/health
Health Check Port: [A PORTA DO CONTAINER - geralmente 80]
Start Period: 90 segundos
Interval: 30 segundos
Timeout: 10 segundos
Retries: 3
```

**Importante:** A porta do Health Check DEVE ser a mesma porta do container!

### 3. Verificar Variáveis de Ambiente

**No EasyPanel:**
1. Vá em **Settings** → **Environment Variables**
2. Verifique se existe:
   ```
   PORT=80
   ```
   ou
   ```
   PORT=3000
   ```
   (dependendo da configuração do EasyPanel)

### 4. Testar Endpoint Manualmente

Tente acessar diretamente o endpoint de health check:

**Se a porta for 80:**
```
https://mei-manager-hyperlane-warp-ui.uegc2m.easypanel.host/api/health
```

**Se a porta for 3000:**
```
https://mei-manager-hyperlane-warp-ui.uegc2m.easypanel.host:3000/api/health
```

**Resposta esperada:**
```json
{"status":"ok","timestamp":"2026-01-20T...","uptime":123}
```

### 5. Se o Endpoint Não Responder

Se o endpoint `/api/health` não responder, verifique:

1. **Logs do Container** (no EasyPanel → Console):
   - Procure por erros
   - Verifique se a aplicação iniciou corretamente

2. **Tente acessar a página principal:**
   ```
   https://mei-manager-hyperlane-warp-ui.uegc2m.easypanel.host/
   ```
   - Se funcionar, o problema é só no health check
   - Se não funcionar, há um problema maior

### 6. Desabilitar Health Check Temporariamente

**Como último recurso:**

1. No EasyPanel: **Settings** → **Health Check**
2. **Desabilite o Health Check** temporariamente
3. A aplicação deve ficar acessível (mas sem monitoramento)

⚠️ **Não recomendado para produção**, mas útil para diagnóstico.

## 🐛 Problemas Comuns

### Problema 1: Porta Incorreta

**Sintoma:** Container roda mas health check falha

**Solução:** 
- Verifique a porta real do container nos logs
- Configure o health check com a mesma porta

### Problema 2: Health Check Muito Cedo

**Sintoma:** Container inicia mas health check falha imediatamente

**Solução:**
- Aumente o **Start Period** para `120` segundos
- Dê mais tempo para a aplicação inicializar completamente

### Problema 3: Timeout Muito Curto

**Sintoma:** Health check falha após alguns segundos

**Solução:**
- Aumente o **Timeout** para `15` ou `20` segundos
- A aplicação pode estar demorando para responder

### Problema 4: Endpoint Não Existe

**Sintoma:** `/api/health` retorna 404

**Verificação:**
- Acesse: `https://seu-dominio.com/api/health`
- Se retornar 404, o endpoint não foi criado no build

**Solução:**
- Verifique se `src/pages/api/health.ts` existe
- Faça um novo build e deploy

## 📋 Checklist Final

Antes de desistir, verifique:

- [ ] Container está rodando (não está "Stopped" ou "Restarting")
- [ ] Logs mostram "Ready on http://0.0.0.0:X"
- [ ] Health Check Path está configurado como `/api/health`
- [ ] Health Check Port está igual à Container Port
- [ ] Start Period está configurado para pelo menos 90 segundos
- [ ] Você consegue acessar `/api/health` diretamente no navegador
- [ ] Variável `PORT` está configurada nas variáveis de ambiente

## 🔧 Configuração Recomendada

**No EasyPanel, configure assim:**

### Network:
- Container Port: `80` (ou `3000`, dependendo da configuração)
- Protocol: `HTTP`

### Health Check:
- Type: `HTTP`
- Path: `/api/health`
- Port: `80` (ou `3000`, **DEVE SER IGUAL** à Container Port)
- Start Period: `90` segundos
- Interval: `30` segundos
- Timeout: `10` segundos
- Retries: `3`

### Environment Variables:
- `NODE_ENV=production`
- `PORT=80` (ou `3000`)
- `HOSTNAME=0.0.0.0`

## 💡 Dica Final

Se nada funcionar:

1. **Desabilite o Health Check** temporariamente
2. Acesse a aplicação diretamente pela URL
3. Se funcionar, o problema é apenas na configuração do health check
4. Ajuste a configuração e reabilite

## 📞 Suporte

Se após seguir todos os passos ainda não funcionar:
1. Capture os logs do container
2. Capture a resposta do endpoint `/api/health`
3. Verifique a configuração do EasyPanel (screenshots)
