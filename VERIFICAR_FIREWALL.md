# Verificar se Firewall Está Bloqueando

## 🔍 Porta do Next.js

**Porta do Next.js: `4091`**

Esta é a porta configurada em:
- `Dockerfile` (linha 85): `ENV PORT=4091`
- `start-server.sh`: `export PORT=${PORT:-4091}`
- Logs mostram: `Network: http://0.0.0.0:4091`

## 🤔 Pode Ser Firewall?

**Provavelmente NÃO é firewall** porque:
- ✅ Você consegue ver o HTML (a porta 4091 está acessível)
- ✅ O servidor está respondendo
- ❌ Mas os arquivos JavaScript não carregam

**No entanto**, pode ser que:
- O firewall esteja bloqueando requisições subsequentes
- O EasyPanel/Nginx esteja bloqueando arquivos estáticos
- Haja um problema de CORS ou CSP

## ✅ Como Verificar se É Firewall

### Teste 1: Verificar Console do Navegador

1. Abra `http://31.97.91.4:4091/`
2. Pressione `F12` (DevTools)
3. Vá na aba **Network**
4. Recarregue a página (`F5`)
5. Procure por arquivos que falharam:
   - Arquivos com status **404** ou **403**
   - Arquivos em `/_next/static/` que não carregaram
   - Erros como `net::ERR_CONNECTION_REFUSED` ou `net::ERR_BLOCKED_BY_CLIENT`

**Se ver erros de conexão recusada** → Pode ser firewall
**Se ver 404** → Arquivos não encontrados (não é firewall)
**Se ver 403** → Pode ser firewall ou permissões

### Teste 2: Testar Arquivo Estático Diretamente

Tente acessar diretamente um arquivo JavaScript:
```
http://31.97.91.4:4091/_next/static/chunks/main-0c2ce8d1530ec3a9.js
```

**Resultados possíveis:**
- ✅ **Arquivo carrega** → Não é firewall, problema é outro (CSP, JavaScript, etc.)
- ❌ **Connection refused** → Pode ser firewall bloqueando
- ❌ **404 Not Found** → Arquivo não existe (problema de build/deploy)
- ❌ **403 Forbidden** → Pode ser firewall ou permissões

### Teste 3: Verificar Firewall na Hostinger

Se você tiver acesso ao painel da Hostinger:

1. **Acesse o painel de controle da Hostinger**
2. Vá em **Firewall** ou **Segurança**
3. Verifique se a porta **4091** está aberta
4. Verifique se há regras bloqueando requisições HTTP

**Importante:** 
- Se o EasyPanel está fazendo proxy, você geralmente **NÃO precisa** abrir a porta 4091 externamente
- O EasyPanel faz proxy da porta 80/443 para a porta 4091 do container
- A porta 4091 só precisa estar acessível **dentro do servidor** (container → host)

## 🔧 Configuração de Firewall (Se Necessário)

### Se Precisar Abrir Porta 4091 (Geralmente NÃO é necessário)

**No painel da Hostinger:**
1. Vá em **Firewall** ou **Segurança**
2. Adicione regra:
   - **Porta:** `4091`
   - **Protocolo:** `TCP`
   - **Ação:** `Permitir`
   - **Origem:** `0.0.0.0/0` (todas as origens) ou seu IP específico

**⚠️ ATENÇÃO:** Se o EasyPanel está fazendo proxy, você **NÃO deve** abrir a porta 4091 externamente. Isso pode causar problemas de segurança.

### Verificar Configuração do EasyPanel

O problema mais provável **NÃO é firewall**, mas sim:

1. **EasyPanel não está fazendo proxy corretamente**
   - Verifique: Settings → Network → Container Port: 4091
   - Verifique se há um domínio configurado

2. **Arquivos estáticos não estão sendo servidos**
   - Verifique se o build copiou os arquivos `.next/static`
   - Verifique permissões dos arquivos

3. **CSP bloqueando scripts**
   - Verifique console do navegador para erros de CSP
   - Veja `SOLUCAO_PAGINA_BRANCA.md` para mais detalhes

## 📝 Checklist de Diagnóstico

- [ ] Console do navegador verificado (aba Network)
- [ ] Arquivo estático testado diretamente via URL
- [ ] Firewall da Hostinger verificado (se tiver acesso)
- [ ] Configuração do EasyPanel verificada (Container Port: 4091)
- [ ] Logs do container verificados (sem erros de permissão)

## 🎯 Próximos Passos

1. **Primeiro:** Verifique o console do navegador (Teste 1)
2. **Segundo:** Teste um arquivo estático diretamente (Teste 2)
3. **Terceiro:** Se ainda não funcionar, verifique firewall (Teste 3)

**Na maioria dos casos, o problema NÃO é firewall**, mas sim:
- CSP bloqueando scripts
- Arquivos estáticos não sendo servidos
- Problema de configuração do EasyPanel

## 📞 Informações para Diagnóstico

Se quiser que eu ajude mais, me envie:

1. **Screenshot do Console do navegador** (aba Network, mostrando arquivos que falharam)
2. **Resultado do teste de arquivo estático** (URL direta do JS)
3. **Logs do container** (últimas 20 linhas)
