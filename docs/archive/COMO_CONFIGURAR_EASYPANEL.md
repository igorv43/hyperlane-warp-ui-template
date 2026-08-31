# Como Configurar Variáveis de Ambiente no EasyPanel

O EasyPanel não executa `docker run` manualmente. Ele gerencia os containers automaticamente. Você precisa configurar as variáveis de ambiente através da interface do EasyPanel.

## 📋 Passo a Passo no EasyPanel

### 1. Acessar Configurações do Serviço

1. No EasyPanel, vá para seu projeto
2. Clique no serviço `hyperlane-warp-ui`
3. Clique em **"Settings"** (Configurações)

### 2. Configurar Variáveis de Ambiente

1. Vá em **"Environment Variables"** ou **"Variáveis de Ambiente"**
2. Clique em **"Add Variable"** ou **"Adicionar Variável"**
3. Adicione cada variável uma por uma:

#### Variáveis Obrigatórias:

```
Nome: NODE_ENV
Valor: production
```

```
Nome: NEXT_TELEMETRY_DISABLED
Valor: 1
```

```
Nome: PORT
Valor: 3000
```

```
Nome: HOSTNAME
Valor: 0.0.0.0
```

#### Variáveis Opcionais (se necessário):

```
Nome: NEXT_PUBLIC_WALLET_CONNECT_ID
Valor: seu-project-id-aqui
```

```
Nome: SENTRY_AUTH_TOKEN
Valor: seu-token-sentry
```

### 3. Como o EasyPanel Executa

O EasyPanel provavelmente executa algo equivalente a:

```bash
docker run \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  -e NEXT_PUBLIC_WALLET_CONNECT_ID=... \
  -p 80:3000 \
  sua-imagem:tag
```

**Importante:** O EasyPanel pode usar uma porta diferente (geralmente 80) e fazer proxy para a porta do container.

### 4. Verificar Configuração Atual

Para verificar quais variáveis estão configuradas:

1. No EasyPanel → Settings → Environment Variables
2. Liste todas as variáveis
3. Certifique-se de que estão corretas

### 5. Ordem de Prioridade

As variáveis de ambiente seguem esta ordem (maior prioridade primeiro):

1. **Variáveis definidas no EasyPanel** (Settings → Environment Variables)
2. **Variáveis no Dockerfile** (ENV PORT=3000) - são padrão
3. **Valores padrão do código** (se existirem)

### 6. Variáveis NEXT_PUBLIC_*

**CRÍTICO:** Variáveis que começam com `NEXT_PUBLIC_` precisam estar disponíveis **DURANTE O BUILD**, não apenas no runtime!

**No EasyPanel:**
- Configure `NEXT_PUBLIC_WALLET_CONNECT_ID` nas variáveis de ambiente
- Elas serão disponibilizadas durante o build automaticamente

### 7. Verificar se Está Funcionando

Após configurar as variáveis:

1. **Faça um novo Deploy** (isso é importante!)
2. **Verifique os logs** do container
3. Os logs devem mostrar a aplicação rodando na porta correta

### 8. Exemplo de Configuração Completa

No EasyPanel, você deve ter estas variáveis:

```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_WALLET_CONNECT_ID=seu-project-id (opcional)
```

## 🔍 Troubleshooting

### Problema: Variável não está sendo aplicada

**Solução:**
1. Verifique se adicionou corretamente no EasyPanel
2. Verifique se não há espaços extras no nome ou valor
3. **Faça um novo deploy** para aplicar as mudanças
4. Verifique os logs do container para confirmar

### Problema: PORT não está funcionando

**Solução:**
1. Verifique qual porta o EasyPanel está usando
2. Pode ser que o EasyPanel esteja usando porta 80 internamente
3. Configure `PORT=80` nas variáveis de ambiente se necessário
4. Ou deixe `PORT=3000` e configure o mapeamento de porta no EasyPanel

### Problema: NEXT_PUBLIC_* não funciona

**Solução:**
1. Essas variáveis precisam estar configuradas **ANTES** do build
2. Configure no EasyPanel → Environment Variables
3. **Faça um novo build/deploy** (não apenas restart)
4. As variáveis `NEXT_PUBLIC_*` são embutidas no código durante o build

## 📝 Checklist

Antes de fazer deploy, certifique-se de ter:

- [ ] `NODE_ENV=production` configurado
- [ ] `PORT=3000` (ou a porta que o EasyPanel usa)
- [ ] `HOSTNAME=0.0.0.0` configurado
- [ ] `NEXT_TELEMETRY_DISABLED=1` configurado
- [ ] Todas as variáveis `NEXT_PUBLIC_*` necessárias configuradas
- [ ] Fez um novo deploy após configurar as variáveis

## 💡 Dica

Se você não souber qual porta o EasyPanel está usando:

1. Veja os logs do container após iniciar
2. Procure por: `Ready on http://0.0.0.0:X`
3. O `X` é a porta que o container está usando
4. Configure essa porta no Health Check do EasyPanel
