# Guia de Variáveis de Ambiente - Hyperlane Warp UI

Este documento explica como configurar as variáveis de ambiente para rodar a aplicação em produção.

## 🔑 Variáveis Críticas

### NODE_ENV (Obrigatória)

```env
NODE_ENV=production
```

**Por que é importante?**
- O código em `next.config.js` verifica: `const isDev = process.env.NODE_ENV !== 'production'`
- Se `NODE_ENV` não for `production`, a aplicação roda em modo desenvolvimento
- Em desenvolvimento, headers de segurança são relaxados e recursos de debug são habilitados

**O que acontece quando está em produção:**
- ✅ Headers de segurança mais restritivos
- ✅ CSP (Content Security Policy) mais estrito
- ✅ `block-all-mixed-content` habilitado
- ✅ `upgrade-insecure-requests` habilitado
- ✅ Desabilita `'unsafe-eval'` em scripts

## 📋 Configuração para Produção

### No EasyPanel

1. Acesse: **Settings** → **Environment Variables**
2. Adicione as seguintes variáveis:

#### Mínimo Obrigatório:

```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### Para Funcionamento Completo:

```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_WALLET_CONNECT_ID=seu-project-id-walletconnect
```

### No Docker (docker-compose.yml)

```yaml
environment:
  - NODE_ENV=production
  - NEXT_TELEMETRY_DISABLED=1
  - NEXT_PUBLIC_WALLET_CONNECT_ID=seu-project-id
```

### No Dockerfile

O Dockerfile já define `NODE_ENV=production` por padrão:
```dockerfile
ENV NODE_ENV=production
```

Mas o EasyPanel pode sobrescrever isso se você definir nas variáveis de ambiente.

## ⚠️ IMPORTANTE: Variáveis NEXT_PUBLIC_*

Variáveis que começam com `NEXT_PUBLIC_` são **embutidas no build** do Next.js, não apenas no runtime!

### Como funciona:

1. **Durante o BUILD** (`pnpm run build`):
   - O Next.js lê todas as variáveis `NEXT_PUBLIC_*`
   - Elas são **inseridas no código JavaScript** compilado
   - Se você mudar depois do build, **não terá efeito** até rebuild

2. **Durante o RUNTIME**:
   - Variáveis normais (sem `NEXT_PUBLIC_`) são lidas do ambiente
   - Podem ser mudadas sem rebuild

### Exemplo:

```typescript
// src/consts/config.ts
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';
```

Esta variável precisa estar disponível **DURANTE O BUILD**, não apenas no runtime!

### No EasyPanel:

✅ **Correto:** Configure `NEXT_PUBLIC_WALLET_CONNECT_ID` nas variáveis de ambiente do EasyPanel **ANTES** do build

❌ **Errado:** Configurar apenas no runtime após o build

## 🔐 Variáveis Importantes

### NEXT_PUBLIC_WALLET_CONNECT_ID (Altamente Recomendado)

```env
NEXT_PUBLIC_WALLET_CONNECT_ID=seu-project-id-walletconnect
```

**O que acontece sem ela:**
- Aplicação inicia normalmente
- Mas recursos de wallet não funcionarão
- Usuários não conseguirão conectar wallets

**Como obter:**
1. Acesse: https://cloud.walletconnect.com
2. Crie um novo projeto
3. Copie o Project ID

### SENTRY_AUTH_TOKEN (Opcional)

```env
SENTRY_AUTH_TOKEN=seu-token-sentry
```

**O que acontece sem ela:**
- Aplicação funciona normalmente
- Source maps não serão enviados ao Sentry
- Erros terão menos contexto no Sentry

**Como obter:**
1. Acesse: https://sentry.io
2. Vá em Settings → Auth Tokens
3. Crie um novo token com permissões de `project:releases`

## 📝 Variáveis Opcionais

### Registry Customizado

```env
NEXT_PUBLIC_REGISTRY_URL=https://registry.example.com
NEXT_PUBLIC_REGISTRY_BRANCH=main
```

Use apenas se tiver um registry customizado. Caso contrário, usa o registry oficial do NPM.

### Overrides de RPC

```env
NEXT_PUBLIC_RPC_OVERRIDES={"chainName":{"http":"https://custom-rpc.com"}}
```

Permite usar RPCs customizados para chains específicas.

## 🐳 Variáveis de Runtime (Docker)

### PORT

```env
PORT=3000
```

Porta em que o servidor Next.js escuta. O EasyPanel pode sobrescrever isso.

### HOSTNAME

```env
HOSTNAME=0.0.0.0
```

Hostname para o servidor. `0.0.0.0` permite conexões externas.

## ✅ Checklist de Produção

Antes de fazer deploy, certifique-se de ter configurado:

- [ ] `NODE_ENV=production` definido
- [ ] `NEXT_TELEMETRY_DISABLED=1` definido
- [ ] `NEXT_PUBLIC_WALLET_CONNECT_ID` configurado (se precisar de wallets)
- [ ] Todas as variáveis `NEXT_PUBLIC_*` configuradas **ANTES** do build
- [ ] Variáveis de runtime (`PORT`, `HOSTNAME`) configuradas se necessário

## 🔍 Verificando Configuração

### Durante o Build:

Os logs do build devem mostrar:
```
- Environments: .env
```

Isso indica que variáveis de ambiente foram detectadas.

### Durante o Runtime:

Para verificar se as variáveis estão corretas, você pode criar um endpoint temporário:

```typescript
// src/pages/api/env-check.ts
export default function handler(req, res) {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    hasWalletConnect: !!process.env.NEXT_PUBLIC_WALLET_CONNECT_ID,
    // Não exponha tokens sensíveis!
  });
}
```

⚠️ **Não exponha** `SENTRY_AUTH_TOKEN` ou outros tokens sensíveis em endpoints públicos!

## 🚨 Problemas Comuns

### "Aplicação roda como desenvolvimento mesmo com NODE_ENV=production"

**Causa:** Variável não foi configurada corretamente no EasyPanel.

**Solução:** 
1. Verifique se `NODE_ENV=production` está definido nas variáveis de ambiente
2. Faça um novo deploy para aplicar

### "Wallet Connect não funciona"

**Causa:** `NEXT_PUBLIC_WALLET_CONNECT_ID` não foi configurado ou foi configurado depois do build.

**Solução:**
1. Configure `NEXT_PUBLIC_WALLET_CONNECT_ID` no EasyPanel
2. Faça um **novo build** (as variáveis `NEXT_PUBLIC_*` são embutidas no build)

### "Variável não tem efeito mesmo após configurar"

**Causa:** Se for uma variável `NEXT_PUBLIC_*`, você precisa fazer rebuild.

**Solução:** Faça um novo deploy (que inclui rebuild)

## 📚 Referências

- [Documentação Next.js - Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Documentação WalletConnect](https://docs.walletconnect.com/)
- [Documentação Sentry - Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
