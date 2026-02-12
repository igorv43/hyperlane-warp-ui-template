# Customizações do SDK Hyperlane

Esta pasta contém customizações do SDK do Hyperlane que corrigem bugs ou adicionam funcionalidades não disponíveis no pacote oficial.

## Estrutura

```
src/custom/
├── adapters/
│   ├── CustomCosmWasmTokenAdapter.ts  # Adapters customizados para CW20
│   └── index.ts                        # Exports dos adapters
├── TokenFactory.ts                     # Factory para criar tokens com adapters customizados
└── README.md                           # Esta documentação
```

## Problemas Corrigidos

### 1. CwTokenAdapter.getBalance() não usa queryToken

**Problema:** O `CwTokenAdapter.getBalance()` usa `provider.getBalance()` que é para denoms nativos, não para contratos CW20.

**Solução:** `CustomCwTokenAdapter` sobrescreve `getBalance()` para usar `queryToken({ balance: { address } })`.

### 2. CwHypCollateralAdapter não suporta CW20 como colateral

**Problema:** O `CwHypCollateralAdapter` não suporta tokens CW20 como colateral porque:
- `getDenom()` só verifica `'native' in tokenType`
- `getBalance()` tenta usar `getDenom()` que falha para CW20

**Solução:** `CustomCwHypCollateralAdapter`:
- Sobrescreve `getDenom()` para verificar `'cw20' in tokenType` e retornar `addresses.token`
- Sobrescreve `getBalance()` para usar `queryContractSmart` quando o colateral é CW20

## Como Usar

### Opção 1: Usar TokenFactory Customizado

```typescript
import { CustomTokenFactory } from '@/custom/TokenFactory';
import { TokenStandard } from '@hyperlane-xyz/sdk';

const token = CustomTokenFactory.createToken(
  'terraclassictestnet',
  TokenStandard.CwHypCollateral,
  'terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l',
  multiProvider,
  {
    collateralAddressOrDenom: 'terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e',
    name: 'Juris Protocol',
    symbol: 'JURIS',
    decimals: 6,
  }
);
```

### Opção 2: Usar Adapters Diretamente

```typescript
import { CustomCwHypCollateralAdapter } from '@/custom/adapters';

const adapter = new CustomCwHypCollateralAdapter(
  'terraclassictestnet',
  multiProvider,
  {
    warpRouter: 'terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l',
    token: 'terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e',
  }
);

const balance = await adapter.getBalance(walletAddress);
```

## Manutenção

Estas customizações são mantidas separadamente do SDK para:
- Não serem afetadas por atualizações do pacote
- Facilitar a manutenção e debugging
- Permitir correções rápidas sem esperar atualizações do SDK

**Importante:** Quando o SDK oficial corrigir estes bugs, estas customizações podem ser removidas.

## Notas

- As classes customizadas estendem as classes do SDK, então mantêm compatibilidade total
- Os métodos sobrescritos têm fallback para os métodos originais em caso de erro
- Logs de warning são adicionados para facilitar debugging
