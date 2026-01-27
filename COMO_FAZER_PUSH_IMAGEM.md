# Como Fazer Push da Imagem Docker

## 🔍 Problema

Você está tentando fazer push de `terra-classic-hyperlane:latest`, mas precisa especificar um registry (Docker Hub, GitHub, etc.).

## ✅ Soluções

### Opção 1: Docker Hub (Mais Comum)

#### 1. Criar conta no Docker Hub (se não tiver)
- Acesse: https://hub.docker.com
- Crie uma conta gratuita

#### 2. Fazer login
```bash
docker login
# Digite seu usuário e senha do Docker Hub
```

#### 3. Tag da imagem com seu usuário
```bash
# Substitua "seu-usuario" pelo seu usuário do Docker Hub
docker tag terra-classic-hyperlane:latest seu-usuario/terra-classic-hyperlane:latest
```

#### 4. Push para Docker Hub
```bash
docker push seu-usuario/terra-classic-hyperlane:latest
```

#### 5. No EasyPanel, configure:
- Settings → Image: `seu-usuario/terra-classic-hyperlane:latest`
- Settings → Registry: Docker Hub
- Configure credenciais se necessário

---

### Opção 2: GitHub Container Registry (ghcr.io)

#### 1. Gerar token no GitHub
- GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Crie um token com permissão `write:packages`

#### 2. Fazer login
```bash
# Substitua "seu-usuario" e "seu-token"
echo "seu-token" | docker login ghcr.io -u seu-usuario --password-stdin
```

#### 3. Tag e push
```bash
docker tag terra-classic-hyperlane:latest ghcr.io/seu-usuario/terra-classic-hyperlane:latest
docker push ghcr.io/seu-usuario/terra-classic-hyperlane:latest
```

#### 4. No EasyPanel, configure:
- Settings → Image: `ghcr.io/seu-usuario/terra-classic-hyperlane:latest`
- Settings → Registry: GitHub Container Registry
- Configure credenciais (usuário e token)

---

### Opção 3: Registry Privado

Se você tiver um registry privado:

#### 1. Fazer login
```bash
docker login seu-registry.com
```

#### 2. Tag e push
```bash
docker tag terra-classic-hyperlane:latest seu-registry.com/terra-classic-hyperlane:latest
docker push seu-registry.com/terra-classic-hyperlane:latest
```

#### 3. No EasyPanel, configure:
- Settings → Image: `seu-registry.com/terra-classic-hyperlane:latest`
- Settings → Registry: Seu registry
- Configure credenciais

---

## 🎯 Recomendação: Use Build Automático

**A melhor opção é deixar o EasyPanel fazer o build automaticamente:**

1. No EasyPanel: Settings → Build → Selecione "Dockerfile"
2. O EasyPanel fará o build automaticamente usando o Dockerfile
3. Não precisa fazer push manual
4. Sempre atualizado com o código mais recente

Veja: `CONFIGURAR_BUILD_AUTOMATICO_EASYPANEL.md`

---

## 📝 Exemplo Completo (Docker Hub)

```bash
# 1. Login
docker login
# Digite: seu-usuario
# Digite: sua-senha

# 2. Tag
docker tag terra-classic-hyperlane:latest seu-usuario/terra-classic-hyperlane:latest

# 3. Push
docker push seu-usuario/terra-classic-hyperlane:latest

# 4. Verificar
docker images | grep terra-classic-hyperlane
```

---

## ❓ Qual Registry Usar?

- **Docker Hub:** Mais comum, fácil de usar, gratuito para público
- **GitHub Container Registry:** Integrado com GitHub, bom para projetos open source
- **Registry Privado:** Para empresas, mais controle, pode ter custos

---

## 🔧 Troubleshooting

### Erro: "unauthorized: authentication required"
- Verifique se fez login: `docker login`
- Verifique se o token/senha está correto

### Erro: "denied: requested access to the resource is denied"
- Verifique se a imagem está taggeada corretamente com o registry
- Verifique se você tem permissão para fazer push no registry

### Erro: "repository does not exist"
- Crie o repositório no registry primeiro (Docker Hub, GitHub, etc.)
- Ou use um nome de repositório que você tem permissão

---

## ✅ Checklist

Antes de fazer push:

- [ ] Conta criada no registry (Docker Hub, GitHub, etc.)
- [ ] Login feito (`docker login`)
- [ ] Imagem taggeada corretamente (`docker tag`)
- [ ] Permissões verificadas (se registry privado)
- [ ] Push executado (`docker push`)
- [ ] Imagem verificada no registry
- [ ] EasyPanel configurado para usar a imagem
