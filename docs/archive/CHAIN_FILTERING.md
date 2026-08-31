# Chain Filtering Configuration

Este documento descreve as funcionalidades de filtragem de chains implementadas no projeto, permitindo que desenvolvedores configurem quais chains devem ser exibidas na aplicação.

## Visão Geral

Foram implementadas duas funcionalidades de filtragem:

1. **Filtro de Tokens por Chain Name**: Filtra tokens dos warp routes baseado nos nomes das chains
2. **Filtro de Chains por Domain ID**: Filtra chains exibidas no seletor de chains baseado nos domainIds

## Variáveis de Ambiente

### `NEXT_PUBLIC_ALLOWED_CHAINS`

Filtra tokens dos warp routes e chains carregadas baseado nos nomes das chains.

**Formato**: JSON array de strings (nomes das chains)

**Exemplo**:
```bash
NEXT_PUBLIC_ALLOWED_CHAINS='["base","form"]'
```

**Efeito**:
- Filtra tokens dos warp routes para incluir apenas tokens das chains especificadas
- Filtra chains carregadas no `chainMetadata` para incluir apenas as chains especificadas

### `NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS`

Filtra chains exibidas no modal de seleção de chains baseado nos domainIds.

**Formato**: JSON array de números (domainIds)

**Exemplo**:
```bash
NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS='[8453,478]'
```

**Efeito**:
- Filtra chains exibidas no `ChainSelectModal` para incluir apenas chains com os domainIds especificados

## Exemplo de Execução

### Exemplo completo com todas as configurações:

```bash
NEXT_PUBLIC_WALLET_CONNECT_ID='' \
NEXT_PUBLIC_REGISTRY_URL=https://raw.githubusercontent.com/igorv43/hyperlane-registry/main/deployments/warp_routes/warpRouteConfigs.yaml \
NEXT_PUBLIC_ALLOWED_CHAINS='["base","form"]' \
NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS='[8453,478]' \
npm run dev
```

### Exemplo mínimo (apenas filtro de domainIds):

```bash
NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS='[8453,478]' npm run dev
```

## Domain IDs Comuns

| Chain Name | Domain ID |
|------------|-----------|
| base       | 8453      |
| form       | 478       |
| solanamainnet | 1399811149 |
| eclipsemainnet | 1408864445 |
| soon       | 50075007  |
| sonicsvm   | 507150715 |
| solaxy     | 1936682104 |

## Arquivos Modificados

### 1. `src/consts/config.ts`

**Alterações**:
- Adicionada variável `allowedChainDomainIds` para armazenar domainIds permitidos
- Adicionada propriedade `allowedChainDomainIds` na interface `Config`

**Código adicionado**:
```typescript
const allowedChainDomainIds = process?.env?.NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS
  ? JSON.parse(process.env.NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS)
  : null;

// Na interface Config:
allowedChainDomainIds: number[] | null;
```

### 2. `src/features/chains/ChainSelectModal.tsx`

**Alterações**:
- Criada função `filterChainMetadataByDomainId()` para filtrar chains por domainId
- Modificado componente para usar `config.allowedChainDomainIds` ao invés de valores hardcoded

**Função criada**:
```typescript
function filterChainMetadataByDomainId(
  chainMetadata: ChainMap<ChainMetadata>,
  allowedDomainIds: number[],
): ChainMap<ChainMetadata>
```

**Uso**:
```typescript
const allowedDomainIds = config.allowedChainDomainIds;
const filteredChainMetadata = allowedDomainIds
  ? filterChainMetadataByDomainId(chainMetadata, allowedDomainIds)
  : chainMetadata;
```

### 3. `src/features/store.ts`

**Alterações**:
- Adicionado filtro de chains baseado em `NEXT_PUBLIC_ALLOWED_CHAINS` antes de montar o `chainMetadata`

**Código adicionado**:
```typescript
let chainsInTokens = Array.from(new Set(coreConfig.tokens.map((t) => t.chainName)));

// Filter chains if NEXT_PUBLIC_ALLOWED_CHAINS is set
const allowedChains = process?.env?.NEXT_PUBLIC_ALLOWED_CHAINS
  ? JSON.parse(process.env.NEXT_PUBLIC_ALLOWED_CHAINS)
  : null;
if (allowedChains && Array.isArray(allowedChains) && allowedChains.length > 0) {
  const allowedChainsSet = new Set(allowedChains.map((c: string) => c.toLowerCase()));
  chainsInTokens = chainsInTokens.filter((chain) =>
    allowedChainsSet.has(chain.toLowerCase()),
  );
}
```

### 4. `src/features/warpCore/warpCoreConfig.ts`

**Alterações**:
- Adicionada função `filterWarpRoutesByChains()` para filtrar tokens dos warp routes
- Adicionado filtro baseado em `NEXT_PUBLIC_ALLOWED_CHAINS` após carregar o registry

**Função criada**:
```typescript
function filterWarpRoutesByChains(
  warpRoutesConfig: Record<string, WarpCoreConfig>,
  chainNames: string[],
): Record<string, WarpCoreConfig>
```

**Uso**:
```typescript
const allowedChains = process?.env?.NEXT_PUBLIC_ALLOWED_CHAINS
  ? JSON.parse(process.env.NEXT_PUBLIC_ALLOWED_CHAINS)
  : null;
if (allowedChains && Array.isArray(allowedChains) && allowedChains.length > 0) {
  filteredRegistryConfigMap = filterWarpRoutesByChains(filteredRegistryConfigMap, allowedChains);
}
```

## Comportamento

### Quando `NEXT_PUBLIC_ALLOWED_CHAINS` está configurado:

1. **Tokens**: Apenas tokens das chains especificadas são carregados dos warp routes
2. **Chains**: Apenas as chains especificadas são incluídas no `chainMetadata`
3. **Seletor de Chains**: Mostra apenas as chains filtradas (se também houver filtro por domainId)

### Quando `NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS` está configurado:

1. **Seletor de Chains**: O modal de seleção de chains mostra apenas chains com os domainIds especificados
2. **Tokens**: Não afeta diretamente os tokens, mas como apenas chains filtradas aparecem, apenas tokens dessas chains estarão disponíveis

### Quando ambas estão configuradas:

- `NEXT_PUBLIC_ALLOWED_CHAINS` filtra tokens e chains carregadas
- `NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS` filtra adicionalmente as chains exibidas no modal

### Quando nenhuma está configurada:

- Todas as chains e tokens do registry são carregados e exibidos normalmente

## Notas Importantes

1. **Case-insensitive**: O filtro por chain name é case-insensitive
2. **Domain IDs únicos**: Cada chain tem um domainId único, então o filtro por domainId é mais preciso
3. **Performance**: Filtrar chains reduz a quantidade de dados carregados e melhora a performance
4. **Compatibilidade**: Se as variáveis não estiverem configuradas, o comportamento padrão é mantido (todas as chains são exibidas)

## Troubleshooting

### Chains não aparecem no seletor:

1. Verifique se o domainId está correto no `NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS`
2. Verifique se o nome da chain está correto no `NEXT_PUBLIC_ALLOWED_CHAINS`
3. Verifique se o JSON está formatado corretamente (sem espaços extras, aspas corretas)

### Tokens não aparecem:

1. Verifique se a chain do token está incluída em `NEXT_PUBLIC_ALLOWED_CHAINS`
2. Verifique se o warp route contém tokens para as chains especificadas
3. Verifique se o registry URL está correto e acessível

## Exemplos de Configuração

### Apenas Base e Form:

```bash
# .env.local
NEXT_PUBLIC_ALLOWED_CHAINS='["base","form"]'
NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS='[8453,478]'
```

### Apenas Solana:

```bash
# .env.local
NEXT_PUBLIC_ALLOWED_CHAINS='["solanamainnet"]'
NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS='[1399811149]'
```

### Múltiplas Chains EVM:

```bash
# .env.local
NEXT_PUBLIC_ALLOWED_CHAINS='["base","form","ethereum"]'
NEXT_PUBLIC_ALLOWED_CHAIN_DOMAIN_IDS='[8453,478,1]'
```
