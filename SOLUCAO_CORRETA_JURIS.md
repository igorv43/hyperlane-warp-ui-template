# Solução Correta: CwHypCollateralAdapter com CW20

## Problema

O `CwHypCollateralAdapter` não sobrescreve `getDenom()`, então herda de `CwHypNativeAdapter.getDenom()` que só verifica `'native' in tokenType`:

```javascript
async getDenom() {
    const tokenType = await this.cw20adapter.getTokenType();
    if ('native' in tokenType) {
        if ('fungible' in tokenType.native) {
            return tokenType.native.fungible.denom;
        }
    }
    throw new Error(`Token type not supported: ${tokenType}`);
}
```

Quando o contrato warp retorna `{ "type": "cw20" }`, o código não encontra `'native'` e lança o erro.

## Solução

O `CwHypCollateralAdapter` **deveria sobrescrever `getDenom()`** para verificar se o tipo é `cw20` e retornar o endereço do token colateral:

```javascript
export class CwHypCollateralAdapter extends CwHypNativeAdapter {
    // ... código existente ...
    
    async getDenom() {
        const tokenType = await this.cw20adapter.getTokenType();
        
        // Se for token nativo, usa a lógica do pai
        if ('native' in tokenType) {
            if ('fungible' in tokenType.native) {
                return tokenType.native.fungible.denom;
            }
        }
        
        // ✅ Se for CW20, retorna o endereço do token colateral
        if ('cw20' in tokenType) {
            return this.addresses.token;  // Endereço do CW20 colateral
        }
        
        throw new Error(`Token type not supported: ${tokenType}`);
    }
}
```

## Por Que Isso Funciona?

1. O `CwHypCollateralAdapter` recebe `addresses.token` que é o `collateralAddressOrDenom` (endereço do CW20)
2. Quando o contrato warp retorna `type: "cw20"`, o `getDenom()` deveria retornar esse endereço
3. O `getBalance()` então usaria esse endereço para buscar o balance do contrato CW20

## Conclusão

**O problema é que o `CwHypCollateralAdapter` não implementa `getDenom()` corretamente para lidar com CW20.**

A solução é sobrescrever `getDenom()` no `CwHypCollateralAdapter` para verificar se o tipo é `cw20` e retornar `this.addresses.token`.

**Isso é um bug/limitação no SDK do Hyperlane que precisa ser corrigido.**
