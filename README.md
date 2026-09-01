# Terra Classic Bridge UI

> **🌐 No ar / Live at: [https://terraclassic-bridge.xyz](https://terraclassic-bridge.xyz/)**
>
> Esta é a instância oficial do Hyperlane para Terra Classic, rodando em produção nesse domínio.

Interface web da bridge interchain do Terra Classic — **https://terraclassic-bridge.xyz** — para transferir **LUNC** e **USTC** entre Terra Classic, Solana, BNB Chain e Ethereum via [Hyperlane Warp Routes](https://docs.hyperlane.xyz/docs/reference/applications/warp-routes).

[![Terra Classic Bridge rodando em terraclassic-bridge.xyz](./docs/live-site.png)](https://terraclassic-bridge.xyz/)

*A bridge em produção: transferência de LUNC de Solana para Terra Classic em terraclassic-bridge.xyz.*

Fork do template oficial [hyperlane-xyz/hyperlane-warp-ui-template](https://github.com/hyperlane-xyz/hyperlane-warp-ui-template). As rotas LUNC/USTC estão publicadas no [registry oficial do Hyperlane](https://github.com/hyperlane-xyz/hyperlane-registry/tree/main/deployments/warp_routes/LUNC) (PRs [#1559](https://github.com/hyperlane-xyz/hyperlane-registry/pull/1559) e [#1687](https://github.com/hyperlane-xyz/hyperlane-registry/pull/1687)).

### ✅ Aprovado pela governança do Terra Classic

A integração Hyperlane e este deployment foram **aprovados on-chain** pela governança da rede (status `PROPOSAL_STATUS_PASSED`):

- **[Proposta #12200](https://validator.info/terra-classic/governance/12200)** — *Hyperlane Integration on Terra Classic — Multichain Connectivity with Ethereum, BSC, and Solana*
- **[Proposta #12222](https://validator.info/terra-classic/governance/12222)** — *Hyperlane Warp Routes - Solana Mainnet Deployment Funding (LUNC/USTC/CW20)*

Stack: Next.js 15 + React 18, Hyperlane SDK, RainbowKit (EVM), wallet-adapter (Solana), cosmos-kit (Cosmos).

> Documentação histórica (guias antigos de deploy, troubleshooting e changelogs) está arquivada em [`docs/archive/`](./docs/archive/).

---

## 1. Configuração

Todas as configurações vêm de variáveis de ambiente. **Atenção:** variáveis `NEXT_PUBLIC_*` são embutidas **no build** do Next.js — mudar depois do build não tem efeito; é preciso rebuildar.

### Obrigatória

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_WALLET_CONNECT_ID` | Project ID do [WalletConnect Cloud](https://cloud.walletconnect.com) (necessário para conexão de carteiras) |

### Taxa de administração (opcional)

Taxa fixa em USD cobrada por transferência, convertida em tempo real para o token nativo da chain de origem e incluída **na mesma transação** do envio (uma única aprovação). Carteira vazia = taxa desligada naquela chain.

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_ADMIN_FEE_USD` | Valor da taxa em USD (ex.: `0.5`). `0` desliga em todas as chains |
| `NEXT_PUBLIC_ADMIN_FEE_WALLET_TERRACLASSIC` | Carteira `terra1...` que recebe a taxa no Terra Classic |
| `NEXT_PUBLIC_ADMIN_FEE_WALLET_BSC` | Carteira `0x...` na BNB Chain |
| `NEXT_PUBLIC_ADMIN_FEE_WALLET_ETHEREUM` | Carteira `0x...` na Ethereum |
| `NEXT_PUBLIC_ADMIN_FEE_WALLET_SOLANA` | Carteira Solana (base58) |

### Demais opcionais

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_TX_MEMO` | Memo gravado nas transações Cosmos (default `terraclassic-bridge`) |
| `NEXT_PUBLIC_REGISTRY_URL` / `NEXT_PUBLIC_REGISTRY_BRANCH` | Registry Hyperlane customizado (default: registry oficial) |
| `NEXT_PUBLIC_RPC_OVERRIDES` | JSON com RPCs próprios por chain: `{"chain":{"http":"https://..."}}` |
| `NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS` | Restringe as chains exibidas (lista de domain IDs) |
| `NEXT_PUBLIC_GITHUB_PROXY` | Proxy para os fetches do registry no GitHub |
| `NEXT_PUBLIC_TRANSFER_BLACKLIST` / `NEXT_PUBLIC_CHAIN_WALLET_WHITELISTS` | Filtros de rotas/carteiras |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_VERSION`, `NEXT_PUBLIC_REFINER_*` | Telemetria (opcionais) |

Modelo completo em [`.env.example`](./.env.example).

Rotas e branding: `src/consts/warpRoutes.yaml` (tokens), `src/consts/chains.yaml` (chains), `src/consts/app.ts` (nome/cores/logos).

## 2. Executar localmente (desenvolvimento)

Requisitos: Node 20+ e `pnpm@10`.

```sh
pnpm install
cp .env.example .env   # preencha ao menos NEXT_PUBLIC_WALLET_CONNECT_ID
pnpm dev               # http://localhost:3000
```

Checagens: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## 3. Executar no servidor (produção)

### Opção A — Docker (recomendado)

O `Dockerfile` recebe as variáveis como **build args** (por serem `NEXT_PUBLIC_*`):

```sh
docker build \
  --build-arg NEXT_PUBLIC_WALLET_CONNECT_ID=SEU_PROJECT_ID \
  --build-arg NEXT_PUBLIC_ADMIN_FEE_USD=0.5 \
  --build-arg NEXT_PUBLIC_ADMIN_FEE_WALLET_TERRACLASSIC=terra1... \
  --build-arg NEXT_PUBLIC_ADMIN_FEE_WALLET_SOLANA=... \
  -t terraclassic-bridge-ui .

docker run -d -p 3000:3000 --restart unless-stopped terraclassic-bridge-ui
```

A app sobe na porta `3000` (`PORT`/`HOSTNAME` ajustáveis via ambiente no runtime). Há também um `docker-compose.yml` de exemplo.

### Opção B — EasyPanel (deploy atual)

1. Crie um app do tipo **App/Web** apontando para este repositório (branch `main`), build via Dockerfile.
2. Defina as variáveis `NEXT_PUBLIC_*` nas **variáveis de build/ambiente do EasyPanel _antes_ do primeiro build** (elas entram no build, não só no runtime).
3. Exponha a porta do container (`3000`) no proxy/domínio do EasyPanel.
4. Health check: `HTTP`, path `/api/health`, porta do app, start period `120s`, interval `30s`, timeout `15s`, retries `5`.
5. Para atualizar: push no `main` → rebuild no EasyPanel (ou configure build automático por webhook).

### Opção C — Node puro

```sh
pnpm install
NEXT_PUBLIC_WALLET_CONNECT_ID=... pnpm build   # variáveis no momento do build!
pnpm start                                      # porta 3000
```

## 4. Licença

[Apache 2.0](./LICENSE.md) — herdada do template da Hyperlane.
