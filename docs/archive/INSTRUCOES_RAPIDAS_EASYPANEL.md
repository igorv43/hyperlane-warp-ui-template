# Instruções Rápidas - Configurar Health Check no EasyPanel

## 🎯 Problema
Aplicação está rodando na porta 80, mas o ícone está amarelo (health check falhando).

## ✅ Solução Passo a Passo

### 1. Configurar Health Check no EasyPanel

**No EasyPanel App/Web:**

1. **Acesse Settings** → **Health Check** (ou "Health Check")
2. **Configure exatamente assim:**

```
Health Check Type: HTTP
Health Check Path: /api/health
Health Check Port: 80  ← IMPORTANTE: Use a porta 80!
Start Period: 120 segundos
Interval: 30 segundos
Timeout: 15 segundos
Retries: 5
```

**OU se não tiver todas essas opções, configure:**
- **Path:** `/api/health`
- **Port:** `80`
- **Timeout:** `15` segundos
- **Start Period:** `120` segundos

### 2. Verificar Variáveis de Ambiente

**Settings** → **Environment Variables**

Certifique-se de ter:
```
PORT=80
HOSTNAME=0.0.0.0
NODE_ENV=production
```

### 3. Testar Manualmente

Antes de configurar, teste se o endpoint funciona:

1. Abra o navegador
2. Acesse: `https://mei-manager-hyperlane-warp-ui.uegc2m.easypanel.host/api/health`
3. Deve retornar: `{"status":"ok","timestamp":"...","uptime":...}`

**Se retornar isso**, o endpoint funciona e você só precisa configurar o health check no EasyPanel.

### 4. Se o Endpoint Não Funcionar

Se retornar erro 404 ou não responder:

1. Verifique os logs do container no EasyPanel
2. Veja se há algum erro
3. A aplicação pode estar reiniciando constantemente

### 5. Se Nada Funcionar

**Último recurso:** Desabilite o Health Check temporariamente:

1. Settings → Health Check
2. **Desabilite** o Health Check
3. A aplicação ficará acessível sem monitoramento
4. Configure depois quando descobrir o problema

## 📋 Configuração Completa

**No EasyPanel, você precisa ter:**

### Environment Variables:
```
PORT=80
HOSTNAME=0.0.0.0
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Health Check:
```
Type: HTTP
Path: /api/health
Port: 80
Start Period: 120s
Interval: 30s
Timeout: 15s
Retries: 5
```

### Network:
```
Container Port: 80
Protocol: HTTP
```

## 🔍 Verificações

✅ Aplicação está rodando (logs mostram "Ready in Xs")
✅ Rodando na porta 80
✅ Endpoint `/api/health` funciona quando acessado diretamente
❓ Health Check do EasyPanel configurado corretamente?

## ⚠️ Importante

- A **Porta do Health Check** DEVE ser **80** (a mesma que a aplicação está usando)
- Se você configurar porta 3000 no health check, mas a aplicação está na 80, vai falhar
- Depois de configurar, **faça um novo deploy** ou **reinicie o serviço**

## 🎯 Resumo

**O problema é simples:** O EasyPanel precisa saber que o health check deve verificar a porta **80**, não a porta 3000!

**Configure no EasyPanel:**
- Health Check Port: **80**
- Health Check Path: `/api/health`
- Start Period: **120 segundos** (dá tempo para a aplicação iniciar)
