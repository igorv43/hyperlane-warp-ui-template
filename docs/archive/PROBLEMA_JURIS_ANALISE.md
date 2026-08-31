# Análise do Problema JURIS - Token type not supported

## Erro
```
Error fetching balance Error: Token type not supported: [object Object]
    at h.getDenom (_app-5c61fca6f6055af1.js:251:589910)
```

## Causa Raiz

O erro ocorre no método `getDenom()` da classe `CwHypNativeAdapter` (que é estendida por `CwHypCollateralAdapter`).

### Código do SDK (CosmWasmTokenAdapter.js:276-283)

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

### O Problema

1. O `CwHypCollateralAdapter` estende `CwHypNativeAdapter`
2. O `CwHypNativeAdapter.getDenom()` espera que o contrato warp retorne:
   ```json
   {
     "native": {
       "fungible": {
         "denom": "uluna"
       }
     }
   }
   ```

3. Mas o contrato JURIS está retornando um tipo diferente (provavelmente `cw20` ou outro tipo), causando o erro.

### Estrutura Esperada vs Real

**Esperado pelo SDK:**
```json
{
  "type": {
    "native": {
      "fungible": {
        "denom": "uluna"
      }
    }
  }
}
```

**O que o contrato JURIS provavelmente retorna:**
```json
{
  "type": {
    "cw20": {
      "address": "terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e"
    }
  }
}
```

## Soluções Possíveis

### Solução 1: Verificar Configuração do Contrato Warp

O contrato warp do JURIS precisa estar configurado para retornar o tipo de token correto. Verifique:

1. **Query do contrato warp:**
   ```bash
   curl 'https://rpc.luncblaze.com/' \
     -H 'content-type: application/json' \
     --data-raw '{
       "jsonrpc":"2.0",
       "id":1,
       "method":"abci_query",
       "params":{
         "path":"/cosmwasm.wasm.v1.Query/SmartContractState",
         "data":"0a4074657272613173747533636c376d68747363326d66396370757461776664367636653461326e6b6d686870686834376c737272336a366b7464716c636665326c12237b22746f6b656e5f64656661756c74223a7b22746f6b656e5f74797065223a7b7d7d7d",
         "prove":false
       }
     }'
   ```

2. **O contrato deve retornar:**
   - Se usar token nativo como colateral: `{"native": {"fungible": {"denom": "uluna"}}}`
   - Se usar CW20 como colateral: O SDK atual **não suporta** isso diretamente

### Solução 2: Usar Token Nativo como Colateral

Se o contrato warp permite, configure para usar um token nativo (como `uluna`) como colateral ao invés de CW20:

```yaml
JURIS/terraclassictestnet-solanatestnet:
  tokens:
    - addressOrDenom: "terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l"
      chainName: "terraclassictestnet"
      standard: "CwHypCollateral"
      collateralAddressOrDenom: "uluna"  # ✅ Usar denom nativo
      ...
```

### Solução 3: Verificar se o Contrato Suporta o Padrão

O contrato warp do JURIS pode não estar configurado corretamente para usar `CwHypCollateral`. Verifique:

1. O contrato foi deployado com o tipo correto?
2. O `token_default` query retorna o tipo esperado?
3. Há alguma configuração adicional necessária?

## Verificação

Para verificar o que o contrato está retornando, faça uma query direta:

```bash
# Query para obter o token_type do contrato warp
curl 'https://rpc.luncblaze.com/' \
  -H 'content-type: application/json' \
  --data-raw '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"abci_query",
    "params":{
      "path":"/cosmwasm.wasm.v1.Query/SmartContractState",
      "data":"<base64_encoded_query>",
      "prove":false
    }
  }'
```

Onde `<base64_encoded_query>` é a query `{"token_default": {"token_type": {}}}` codificada em base64.

## Conclusão

O problema está na incompatibilidade entre:
- O que o SDK espera: `tokenType.native.fungible.denom`
- O que o contrato retorna: provavelmente `tokenType.cw20` ou outro tipo

**A solução depende de como o contrato warp foi configurado.** Se o contrato realmente usa CW20 como colateral e não pode ser alterado, pode ser necessário:
1. Atualizar o SDK para suportar CW20 como colateral
2. Ou usar um padrão diferente de token
3. Ou reconfigurar o contrato para usar token nativo como colateral
