# Troubleshooting - EasyPanel "Service is not reachable"

Este documento ajuda a diagnosticar e resolver o erro "Service is not reachable" no EasyPanel.

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar Logs do Container

No EasyPanel, acesse:
- **Projeto** → **Logs** (ou **Console**)
- Verifique se há erros durante a inicialização
- Procure por mensagens como:
  - `Ready on http://0.0.0.0:3000` ✅ (aplicação iniciou corretamente)
  - `Error: Cannot find module` ❌ (problema de dependências)
  - `EADDRINUSE` ❌ (porta já em uso)
  - `ENOENT: no such file or directory` ❌ (arquivo não encontrado)

### 2. Verificar Status do Container

No EasyPanel:
- Verifique se o container está **Running** (verde)
- Se estiver **Restarting** (amarelo), há um problema de inicialização
- Se estiver **Stopped** (vermelho), verifique os logs

### 3. Verificar Health Check

**Teste manual do health check:**

1. **Dentro do EasyPanel:**
   - Vá em **Settings** → **Health Check**
   - Verifique se está configurado para `/api/health`
   - Porta deve ser `3000`

2. **Teste direto (se tiver acesso SSH):**
   ```bash
   # Dentro do container
   curl http://localhost:3000/api/health
   # Deve retornar: {"status":"ok","timestamp":"...","uptime":...}
   ```

3. **Teste externo:**
   - Acesse: `https://mei-manager-hyperlane-warp-ui.uegc2m.easypanel.host/api/health`
   - Deve retornar JSON com status "ok"

### 4. Verificar Configuração de Porta

No EasyPanel:
- **Settings** → **Network**
- **Container Port**: `3000`
- **Protocol**: `HTTP`
- **External Port**: `80` (ou deixe em branco para automático)

### 5. Verificar Variáveis de Ambiente

No EasyPanel, **Settings** → **Environment Variables**, certifique-se de ter:

**Mínimo obrigatório:**
```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

**Recomendado (para aplicação funcionar corretamente):**
```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_WALLET_CONNECT_ID=seu-project-id-walletconnect
NEXT_TELEMETRY_DISABLED=1
```

**Nota:** A aplicação pode iniciar sem `NEXT_PUBLIC_WALLET_CONNECT_ID`, mas alguns recursos não funcionarão.

### 6. Verificar Recursos

**Runtime (mínimo recomendado):**
- **CPU**: 1 core (recomendado: 2 cores)
- **Memory**: 1GB (recomendado: 2GB)

Se o container estiver sendo morto por falta de memória, aumente os recursos.

## 🐛 Problemas Comuns e Soluções

### Problema 1: Container reinicia constantemente

**Sintomas:**
- Status: **Restarting**
- Logs mostram erro e depois reinicia

**Possíveis causas:**
1. **Aplicação crasha na inicialização**
   - Verifique logs para erros específicos
   - Verifique se todas as dependências foram instaladas corretamente

2. **Falta de memória**
   - Aumente a memória alocada no EasyPanel
   - Mínimo recomendado: 1GB

3. **Porta em uso**
   - Verifique se não há outro serviço usando a porta 3000
   - Verifique se o `PORT` está configurado corretamente

**Solução:**
```bash
# Verifique os logs mais recentes
# No EasyPanel: Logs → Filtrar por "Error" ou "FATAL"
```

### Problema 2: Health check falha

**Sintomas:**
- Container está rodando
- Mas EasyPanel mostra "Service is not reachable"
- Acesso direto à porta funciona

**Possíveis causas:**
1. **Endpoint de health check não existe**
   - Verifique se `/api/health` está acessível
   - Teste: `curl http://localhost:3000/api/health` (dentro do container)

2. **Health check muito restritivo**
   - Já aumentamos o `start-period` para 60s
   - Se ainda falhar, aumente ainda mais no EasyPanel

**Solução:**
1. No EasyPanel: **Settings** → **Health Check**
2. Aumente **Start Period** para `90s` ou `120s`
3. Aumente **Timeout** para `10s`
4. Aumente **Interval** para `60s`

### Problema 3: Porta não mapeada corretamente

**Sintomas:**
- Container está rodando
- Health check funciona dentro do container
- Mas acesso externo não funciona

**Solução:**
1. No EasyPanel: **Settings** → **Network**
2. Verifique se:
   - **Container Port**: `3000`
   - **Protocol**: `HTTP`
   - **External Port** está configurado (ou deixe em branco)

### Problema 4: Aplicação demora muito para iniciar

**Sintomas:**
- Build completa
- Container inicia mas demora muito para responder

**Solução:**
1. Aumente **Start Period** do health check para `120s`
2. Verifique logs para ver quanto tempo leva para "Ready"
3. Considere aumentar recursos (CPU/Memória)

### Problema 5: Erro "server.js not found"

**Sintomas:**
- Build completa com sucesso
- Container não inicia
- Erro: `Cannot find module '/app/server.js'`

**Causa:**
O Next.js standalone não gerou o `server.js` corretamente.

**Solução:**
1. Verifique se `next.config.js` tem `output: 'standalone'` ✅ (já configurado)
2. Verifique logs do build para garantir que o build foi bem-sucedido
3. Verifique se há erros durante o build do Next.js

### Problema 6: Variáveis de ambiente não aplicadas

**Sintomas:**
- Container inicia mas aplicação não funciona corretamente
- Alguns recursos não carregam

**Solução:**
1. No EasyPanel: **Settings** → **Environment Variables**
2. Certifique-se de que:
   - Todas as variáveis necessárias estão configuradas
   - Valores estão corretos (sem espaços extras)
   - Variáveis `NEXT_PUBLIC_*` estão configuradas (essas são embutidas no build)

**Importante:** Variáveis `NEXT_PUBLIC_*` precisam estar disponíveis **durante o build**, não apenas no runtime.

## 🔧 Comandos Úteis para Debug

Se você tiver acesso SSH ao container:

```bash
# Verificar se o processo está rodando
ps aux | grep node

# Verificar se a porta está escutando
netstat -tlnp | grep 3000
# ou
ss -tlnp | grep 3000

# Testar health check
curl -v http://localhost:3000/api/health

# Verificar variáveis de ambiente
env | grep -E "(PORT|HOSTNAME|NODE_ENV)"

# Verificar se server.js existe
ls -la /app/server.js

# Ver logs do processo
# (se usando PM2 ou similar)
```

## ✅ Checklist de Verificação Rápida

- [ ] Container está em status **Running** (verde)?
- [ ] Logs mostram `Ready on http://0.0.0.0:3000`?
- [ ] Health check `/api/health` retorna status 200?
- [ ] Porta 3000 está configurada no EasyPanel?
- [ ] Variáveis de ambiente estão configuradas?
- [ ] Recursos (CPU/Memória) são suficientes?
- [ ] Health check start-period é suficiente (mínimo 60s)?

## 📞 Próximos Passos

1. **Verifique os logs** no EasyPanel primeiro
2. **Teste o health check** diretamente via URL
3. **Verifique a configuração** de porta e variáveis de ambiente
4. Se nada funcionar, **aumente o start-period** do health check para 120s

## 🔗 Links Úteis

- [Documentação EasyPanel](https://easypanel.io/docs)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Repositório do Projeto](https://github.com/igorv43/hyperlane-warp-ui-template)
