# Solução: "No such image: easypanel/app/hperlane-ui:latest"

## 🔍 Problema

O EasyPanel está tentando usar uma imagem Docker que não existe:
```
No such image: easypanel/app/hperlane-ui:latest
```

## 🔧 Possíveis Causas

### 1. Build Ainda Não Terminou

O build pode estar em andamento. Verifique:
- No EasyPanel, vá em **Logs** ou **Build Logs**
- Procure por mensagens de progresso do build
- Aguarde até ver "Build completed" ou "Build succeeded"

### 2. Build Falhou

Se o build falhou, a imagem não será criada. Verifique:
- No EasyPanel, vá em **Logs** ou **Build Logs**
- Procure por erros (mensagens em vermelho)
- Erros comuns:
  - Falta de memória durante build
  - Erro de compilação do Next.js
  - Arquivo não encontrado

### 3. Nome do Projeto Incorreto

**⚠️ IMPORTANTE:** Notei um typo no nome:
- **Errado:** `hperlane-ui` (falta o "y")
- **Correto:** `hyperlane-ui`

Isso pode causar problemas. Verifique o nome do projeto no EasyPanel.

## ✅ Soluções

### Solução 1: Aguardar Build Completar

1. No EasyPanel, vá em **Logs** ou **Build Logs**
2. Aguarde o build terminar
3. Você deve ver mensagens como:
   - "Build completed successfully"
   - "Image built successfully"
   - "Deploying..."

### Solução 2: Verificar Status do Build

1. No EasyPanel, vá em **Deployments** ou **Builds**
2. Verifique o status:
   - **In Progress** → Aguarde
   - **Failed** → Veja os logs para identificar o erro
   - **Success** → A imagem deve estar disponível

### Solução 3: Verificar Nome do Projeto

1. No EasyPanel, vá em **Settings** → **General**
2. Verifique o nome do projeto
3. Se estiver como `hperlane-ui`, considere renomear para `hyperlane-ui`
4. **Ou** ajuste as configurações para usar o nome correto

### Solução 4: Forçar Novo Build

Se o build falhou ou está travado:

1. No EasyPanel, vá em **Deployments**
2. Clique em **"Redeploy"** ou **"Rebuild"**
3. Aguarde o novo build completar

### Solução 5: Verificar Configuração do Dockerfile

Certifique-se de que:
- O `Dockerfile` está na raiz do projeto
- O `Dockerfile` está commitado no Git
- O EasyPanel está configurado para usar Dockerfile (não buildpack)

## 🔍 Como Verificar se a Imagem Foi Criada

Se você tiver acesso SSH ao servidor:

```bash
# Listar imagens Docker
docker images | grep hperlane

# Ou
docker images | grep hyperlane
```

Se a imagem não aparecer, o build ainda não terminou ou falhou.

## 📝 Checklist de Verificação

- [ ] Build está em andamento? (verifique logs)
- [ ] Build completou com sucesso? (verifique status)
- [ ] Nome do projeto está correto? (verifique typo)
- [ ] Dockerfile está na raiz do projeto?
- [ ] Dockerfile está commitado no Git?
- [ ] EasyPanel está configurado para usar Dockerfile?

## 🎯 Próximos Passos

1. **Verifique os logs do build** no EasyPanel
2. **Aguarde o build terminar** (pode levar 5-15 minutos)
3. **Se o build falhar**, verifique os erros nos logs
4. **Se necessário, force um novo build** (Redeploy)

## 📞 Informações para Suporte

Se o problema persistir, forneça:

1. **Status do build** (In Progress, Failed, Success)
2. **Últimas 50 linhas dos logs do build**
3. **Nome do projeto** no EasyPanel
4. **Configuração do build** (Dockerfile ou buildpack?)
