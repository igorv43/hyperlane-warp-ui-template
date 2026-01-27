# Solução: Erro "pull access denied" no EasyPanel

## 🔍 Problema

O EasyPanel está tentando fazer **pull** da imagem `terra-classic-hyperlane:latest` de um registry Docker (Docker Hub), mas:
- A imagem foi criada apenas **localmente** na sua máquina
- A imagem **não existe** no registry
- O EasyPanel não tem acesso à imagem local

## ✅ Soluções

### Solução 1: Deixar EasyPanel Fazer o Build (Recomendado)

**Esta é a solução mais simples e recomendada:**

1. **No EasyPanel, configure para fazer BUILD ao invés de PULL:**
   - Vá em **Settings** → **Build**
   - Selecione **"Dockerfile"** ou **"Build from Dockerfile"**
   - **NÃO** configure para usar uma imagem pré-construída

2. **O EasyPanel fará o build automaticamente** usando o Dockerfile do repositório Git

3. **Vantagens:**
   - ✅ Não precisa fazer push manual
   - ✅ Build automático a cada commit
   - ✅ Sempre atualizado com o código mais recente

### Solução 2: Fazer Push para Docker Hub

Se você realmente quiser usar uma imagem pré-construída:

1. **Fazer login no Docker Hub:**
   ```bash
   docker login
   ```

2. **Tag da imagem com seu usuário:**
   ```bash
   docker tag terra-classic-hyperlane:latest seu-usuario/terra-classic-hyperlane:latest
   ```

3. **Push para Docker Hub:**
   ```bash
   docker push seu-usuario/terra-classic-hyperlane:latest
   ```

4. **No EasyPanel, configure:**
   - Settings → Image: `seu-usuario/terra-classic-hyperlane:latest`
   - Settings → Registry: Docker Hub (ou configure credenciais se privado)

### Solução 3: Usar GitHub Container Registry (ghcr.io)

1. **Gerar token no GitHub:**
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Crie um token com permissão `write:packages`

2. **Fazer login:**
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u seu-usuario --password-stdin
   ```

3. **Tag e push:**
   ```bash
   docker tag terra-classic-hyperlane:latest ghcr.io/seu-usuario/terra-classic-hyperlane:latest
   docker push ghcr.io/seu-usuario/terra-classic-hyperlane:latest
   ```

4. **No EasyPanel, configure:**
   - Settings → Image: `ghcr.io/seu-usuario/terra-classic-hyperlane:latest`
   - Settings → Registry: GitHub Container Registry
   - Configure credenciais do GitHub

### Solução 4: Usar Registry Privado

Se você tiver um registry privado:

1. **Fazer login:**
   ```bash
   docker login seu-registry.com
   ```

2. **Tag e push:**
   ```bash
   docker tag terra-classic-hyperlane:latest seu-registry.com/terra-classic-hyperlane:latest
   docker push seu-registry.com/terra-classic-hyperlane:latest
   ```

3. **No EasyPanel, configure:**
   - Settings → Image: `seu-registry.com/terra-classic-hyperlane:latest`
   - Settings → Registry: Seu registry privado
   - Configure credenciais

## 🎯 Recomendação

**Use a Solução 1** (deixar EasyPanel fazer o build):
- ✅ Mais simples
- ✅ Sempre atualizado
- ✅ Não precisa gerenciar imagens manualmente
- ✅ Build automático a cada commit

## 📝 Configuração no EasyPanel (Solução 1)

1. **Vá em Settings → Build**
2. **Selecione:**
   - Build Method: **"Dockerfile"** ou **"Docker"**
   - Dockerfile Path: `Dockerfile` (ou deixe em branco se estiver na raiz)
   - Context: `.` (ou deixe em branco)

3. **Configure recursos:**
   - Memória: 6-8GB durante build
   - CPU: 2-4 cores
   - Timeout: 30-45 minutos

4. **Salve e faça deploy**

## 🔍 Verificar Configuração Atual

No EasyPanel, verifique:
- **Settings → Build** → Qual método está configurado?
- **Settings → Image** → Está configurado para fazer pull de uma imagem?

Se estiver configurado para fazer **pull**, mude para fazer **build**.

## ❓ Qual Solução Usar?

- **Se você quer simplicidade:** Use Solução 1 (build automático)
- **Se você quer controle total:** Use Solução 2, 3 ou 4 (push manual)
- **Se você tem CI/CD:** Use Solução 2, 3 ou 4 (push no CI/CD)
