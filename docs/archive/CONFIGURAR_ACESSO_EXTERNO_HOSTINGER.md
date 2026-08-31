# Como Configurar Acesso Externo ao Container na Hostinger

Este guia explica como configurar o acesso externo ao container na Hostinger usando EasyPanel.

## 🔍 Situação Atual

Baseado nos logs de implantação:
- ✅ Container está rodando: `app_hyperlane-ui-app-1`
- ✅ Next.js está escutando em: `0.0.0.0:4091`
- ✅ Aplicação iniciou com sucesso
- ❓ Acesso externo pode não estar configurado

## 📋 Passo a Passo para Configurar Acesso Externo

### 1. Configurar Porta do Container no EasyPanel

1. **Acesse o EasyPanel** na Hostinger
2. Vá para seu projeto: `app_hyperlane-ui`
3. Clique no serviço `app-1` (ou nome do seu serviço)
4. Vá em **Settings** → **Network** (ou **Rede**)

#### Configurações de Rede:

```
Container Port: 4091
Protocol: HTTP
External Port: (deixe em branco ou configure 80/443)
```

**Importante:**
- A **Container Port** deve ser `4091` (mesma porta que o Next.js está usando)
- O EasyPanel fará o mapeamento automático para a porta externa
- Se você tiver um domínio, o EasyPanel geralmente usa porta 80 (HTTP) ou 443 (HTTPS)

### 2. Verificar Variáveis de Ambiente

No EasyPanel: **Settings** → **Environment Variables**

Certifique-se de ter estas variáveis configuradas:

```env
NODE_ENV=production
PORT=4091
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

**Nota:** O `HOSTNAME=0.0.0.0` é **CRÍTICO** para permitir conexões externas. Sem isso, o servidor só aceita conexões locais.

### 3. Configurar Domínio/Subdomínio (Opcional mas Recomendado)

Se você tem um domínio na Hostinger:

1. No EasyPanel: **Settings** → **Domains** (ou **Domínios**)
2. Adicione seu domínio ou subdomínio:
   - Exemplo: `hyperlane-ui.seudominio.com`
   - Ou: `app.seudominio.com`
3. O EasyPanel configurará automaticamente o proxy reverso

**Sem domínio:**
- O EasyPanel geralmente fornece uma URL temporária
- Procure por algo como: `app_hyperlane-ui.uegc2m.easypanel.host`
- Esta URL deve estar visível no painel do EasyPanel

### 4. Verificar Configuração de Firewall

Na Hostinger, verifique se o firewall permite tráfego nas portas:

1. **Porta 80** (HTTP) - deve estar aberta
2. **Porta 443** (HTTPS) - deve estar aberta (se usando SSL)
3. **Porta 4091** - geralmente não precisa estar aberta externamente (o EasyPanel faz proxy)

**Nota:** O EasyPanel geralmente gerencia o firewall automaticamente, mas se você tiver acesso ao painel da Hostinger, verifique.

### 5. Verificar Status do Serviço

No EasyPanel, verifique:

1. **Status do Container**: Deve estar **Running** (verde)
2. **Health Check**: Deve estar passando
3. **Logs**: Não deve haver erros críticos

### 6. Testar Acesso Externo

#### Teste 1: Via URL do EasyPanel

Se o EasyPanel forneceu uma URL, teste:
```
http://app_hyperlane-ui.uegc2m.easypanel.host
```

#### Teste 2: Via Domínio Configurado

Se você configurou um domínio:
```
http://seu-dominio.com
```

#### Teste 3: Via IP do Servidor (se tiver acesso)

Se você souber o IP do servidor:
```
http://IP_DO_SERVIDOR:80
```

**Nota:** Geralmente você não precisa especificar a porta 4091 externamente, pois o EasyPanel faz proxy da porta 80/443 para a porta 4091 do container.

## 🔧 Solução de Problemas

### Problema: Container roda mas não é acessível externamente

**Possíveis causas:**

1. **Porta do container não está mapeada**
   - ✅ Solução: Configure `Container Port: 4091` em Settings → Network

2. **HOSTNAME não está configurado como 0.0.0.0**
   - ✅ Solução: Adicione `HOSTNAME=0.0.0.0` nas variáveis de ambiente

3. **Firewall bloqueando**
   - ✅ Solução: Verifique firewall na Hostinger (geralmente o EasyPanel gerencia isso)

4. **Domínio não configurado**
   - ✅ Solução: Configure um domínio no EasyPanel ou use a URL fornecida pelo EasyPanel

### Problema: Erro "Connection refused"

**Causa:** O servidor não está escutando em `0.0.0.0`

**Solução:**
1. Verifique se `HOSTNAME=0.0.0.0` está nas variáveis de ambiente
2. Reinicie o container após adicionar a variável
3. Verifique os logs para confirmar: `Network: http://0.0.0.0:4091`

### Problema: Timeout ao acessar

**Causa:** Firewall ou proxy não configurado

**Solução:**
1. Verifique se o EasyPanel está fazendo proxy corretamente
2. Verifique logs do EasyPanel para erros de proxy
3. Entre em contato com suporte da Hostinger se necessário

## 📝 Checklist de Verificação

Antes de considerar o problema resolvido, verifique:

- [ ] Container está em status **Running** (verde)
- [ ] Logs mostram: `Network: http://0.0.0.0:4091`
- [ ] Variável `HOSTNAME=0.0.0.0` está configurada
- [ ] Variável `PORT=4091` está configurada
- [ ] **Container Port** está configurado como `4091` em Settings → Network
- [ ] Domínio está configurado (ou URL do EasyPanel está disponível)
- [ ] Health check está passando
- [ ] Acesso externo funciona via URL/domínio

## 🎯 Configuração Recomendada Final

### Variáveis de Ambiente (Settings → Environment Variables):

```env
NODE_ENV=production
PORT=4091
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

### Configuração de Rede (Settings → Network):

```
Container Port: 4091
Protocol: HTTP
External Port: (deixe em branco - automático)
```

### Health Check (Settings → Health Check):

```
Path: /api/health
Port: 4091
Interval: 30s
Timeout: 15s
Start Period: 120s
Retries: 5
```

## 🔗 Próximos Passos

1. **Configure SSL/HTTPS** (recomendado para produção):
   - No EasyPanel: Settings → SSL
   - Configure certificado Let's Encrypt (geralmente gratuito)

2. **Configure domínio personalizado** (se ainda não fez):
   - Adicione seu domínio no EasyPanel
   - Configure DNS apontando para o servidor da Hostinger

3. **Monitore logs**:
   - Verifique logs regularmente no EasyPanel
   - Configure alertas se disponível

## 📞 Suporte

Se o problema persistir:

1. **Verifique logs detalhados** no EasyPanel
2. **Teste acesso interno** ao container (se tiver acesso SSH)
3. **Entre em contato com suporte da Hostinger** com:
   - Logs do container
   - Configuração de rede atual
   - URL que está tentando acessar
