# Guia Rápido: Verificar Acesso Externo

## ✅ Verificação Rápida (5 minutos)

### 1. Verificar Logs do Container

No EasyPanel → Logs, você deve ver:
```
Network: http://0.0.0.0:4091
✓ Ready in X.Xs
```

**Se não ver `0.0.0.0:4091`**, o problema é o `HOSTNAME`.

### 2. Verificar Configuração de Rede

No EasyPanel → Settings → Network:
- **Container Port**: Deve ser `4091`
- **Protocol**: Deve ser `HTTP`

### 3. Verificar Variáveis de Ambiente

No EasyPanel → Settings → Environment Variables:
- `HOSTNAME=0.0.0.0` ✅ (CRÍTICO)
- `PORT=4091` ✅
- `NODE_ENV=production` ✅

### 4. Testar Acesso

Tente acessar:
- URL fornecida pelo EasyPanel (ex: `app_hyperlane-ui.uegc2m.easypanel.host`)
- Ou seu domínio configurado

## 🔧 Correção Rápida

### Se o container não está acessível externamente:

1. **Adicione/Verifique variável `HOSTNAME`:**
   ```
   Settings → Environment Variables → Add Variable
   Nome: HOSTNAME
   Valor: 0.0.0.0
   ```

2. **Verifique Container Port:**
   ```
   Settings → Network → Container Port: 4091
   ```

3. **Reinicie o container:**
   - No EasyPanel, clique em "Restart" ou "Redeploy"

4. **Aguarde 1-2 minutos** e teste novamente

## 🎯 O Que Deve Funcionar

Após configurar corretamente:

✅ Container mostra: `Network: http://0.0.0.0:4091`
✅ Health check passa
✅ Acesso externo funciona via URL/domínio
✅ Aplicação carrega normalmente

## ❌ Sinais de Problema

❌ Logs mostram: `Network: http://localhost:4091` (deve ser 0.0.0.0)
❌ Erro "Connection refused" ao acessar
❌ Timeout ao acessar
❌ Health check falha

## 📝 Comandos Úteis (se tiver acesso SSH)

```bash
# Verificar se o processo está escutando na porta correta
netstat -tlnp | grep 4091
# Deve mostrar: 0.0.0.0:4091

# Testar acesso interno
curl http://localhost:4091/api/health
# Deve retornar: {"status":"ok",...}

# Verificar variáveis de ambiente do container
docker exec app_hyperlane-ui-app-1 env | grep -E "(PORT|HOSTNAME)"
# Deve mostrar: PORT=4091 e HOSTNAME=0.0.0.0
```
