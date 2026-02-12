# Exemplo de Uso das Customizações

## Como Aplicar as Correções

As customizações foram criadas para corrigir o bug do JURIS e outros tokens CW20. Existem duas formas de aplicá-las:

### Opção 1: Interceptar a Criação do WarpCore (Recomendado)

Modifique o arquivo `src/features/store.ts` para usar os adapters customizados ao criar o WarpCore:

```typescript
// Em src/features/store.ts, após criar o warpCore:

import { CustomCwHypCollateralAdapter } from '@/custom/adapters';
import { TokenStandard } from '@hyperlane-xyz/sdk';

// Após: const warpCore = WarpCore.FromConfig(multiProvider, coreConfig);

// Aplicar adapters customizados para tokens CwHypCollateral
warpCore.tokens.forEach((token) => {
  if (
    token.standard === TokenStandard.CwHypCollateral &&
    token.collateralAddressOrDenom
  ) {
    try {
      const customAdapter = new CustomCwHypCollateralAdapter(
        token.chainName,
        multiProvider,
        {
          warpRouter: token.addressOrDenom,
          token: token.collateralAddressOrDenom,
        },
      );
      
      // @ts-ignore - Substituindo o adapter interno
      token.adapter = customAdapter;
    } catch (error) {
      console.warn('Error applying custom adapter to token:', error);
    }
  }
});
```

### Opção 2: Usar o Hook useCustomToken

Use o hook `useCustomToken` quando precisar de um token específico:

```typescript
import { useCustomToken } from '@/custom/useCustomToken';
import { useTokenByIndex } from '@/features/tokens/hooks';

function MyComponent() {
  const token = useTokenByIndex(tokenIndex);
  const multiProvider = useMultiProvider();
  const customToken = useCustomToken(token, multiProvider);
  
  // Use customToken ao invés de token
  const balance = await customToken?.getBalance(address);
}
```

### Opção 3: Patch do WarpCore após Criação

Crie um arquivo `src/custom/patchWarpCore.ts`:

```typescript
import { WarpCore, TokenStandard } from '@hyperlane-xyz/sdk';
import { CustomCwHypCollateralAdapter } from './adapters/CustomCosmWasmTokenAdapter';

export function patchWarpCore(warpCore: WarpCore, multiProvider: any): WarpCore {
  warpCore.tokens.forEach((token) => {
    if (
      token.standard === TokenStandard.CwHypCollateral &&
      token.collateralAddressOrDenom
    ) {
      try {
        const customAdapter = new CustomCwHypCollateralAdapter(
          token.chainName,
          multiProvider,
          {
            warpRouter: token.addressOrDenom,
            token: token.collateralAddressOrDenom,
          },
        );
        
        // @ts-ignore
        token.adapter = customAdapter;
      } catch (error) {
        console.warn('Error patching token:', error);
      }
    }
  });
  
  return warpCore;
}
```

E use em `src/features/store.ts`:

```typescript
import { patchWarpCore } from '@/custom/patchWarpCore';

// Após criar o warpCore:
const warpCore = WarpCore.FromConfig(multiProvider, coreConfig);
const patchedWarpCore = patchWarpCore(warpCore, multiProvider);
```

## Verificação

Para verificar se as correções estão funcionando:

1. Abra o console do navegador
2. Tente buscar o balance do token JURIS
3. Não deve mais aparecer o erro "Token type not supported"
4. O balance deve ser retornado corretamente

## Notas Importantes

- As customizações são mantidas em `src/custom/` e não serão afetadas por atualizações do SDK
- Quando o SDK oficial corrigir o bug, você pode remover estas customizações
- Os métodos têm fallback para os originais em caso de erro
