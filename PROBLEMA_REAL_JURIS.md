# Problema Real: JURIS com CW20 como Colateral

## Situação

O contrato warp do JURIS está configurado como:
```json
{
  "type": "cw20",
  "mode": "collateral",
  "config": {
    "collateral": {
      "address": "terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e"
    }
  }
}
```

## O Problema Real

O `CwHypCollateralAdapter` estende `CwHypNativeAdapter`, que implementa `getBalance()` assim:

```javascript
async getBalance(address) {
    const provider = await this.getProvider();
    const denom = await this.getDenom();  // ❌ Tenta obter denom do token_type
    const balance = await provider.getBalance(address, denom);
    return BigInt(balance.amount);
}
```

O `getDenom()` faz query `token_default.token_type` no contrato warp e espera:
```json
{ "native": { "fungible": { "denom": "uluna" } } }
```

Mas o contrato retorna:
```json
{ "type": "cw20" }  // ❌ Erro: Token type not supported
```

## Por Que Isso Acontece?

O `CwHypCollateralAdapter` **não sobrescreve** o método `getBalance()`. Ele herda de `CwHypNativeAdapter`, que foi projetado para tokens nativos, não para CW20.

Quando o colateral é um CW20, o balance deveria ser buscado diretamente do contrato CW20 usando `CwTokenAdapter.getBalance()`:

```javascript
async getBalance(address) {
    const provider = await this.getProvider();
    const balance = await provider.getBalance(address, this.addresses.token);  // ✅ Usa o endereço do CW20
    return BigInt(balance.amount);
}
```

O `CwHypCollateralAdapter` recebe `addresses.token` (o endereço do CW20 colateral), mas não está usando isso.

## Solução

### Opção 1: Bug no SDK (Mais Provável)

O `CwHypCollateralAdapter` deveria sobrescrever `getBalance()` para usar o token CW20 diretamente quando o colateral é um CW20. Isso parece ser um bug ou limitação do SDK atual.

### Opção 2: Contrato Warp Precisa Retornar Denom Nativo

Se o SDK realmente espera que `getDenom()` funcione, então o contrato warp precisa retornar um denom nativo no `token_type`, mesmo quando usa CW20 como colateral. Mas isso não faz sentido conceitualmente - o colateral é um CW20, não um denom nativo.

### Opção 3: Verificar se Há Outra Forma de Buscar Balance

Talvez haja uma query diferente no contrato warp para obter o balance do colateral CW20, ou o SDK deveria usar `addresses.token` diretamente.

## Conclusão

**O problema é uma limitação/bug no SDK do Hyperlane.**

O `CwHypCollateralAdapter` não implementa corretamente `getBalance()` para tokens com colateral CW20. Ele tenta usar `getDenom()` que espera um token nativo, mas o colateral é um CW20.

**Possíveis soluções:**
1. Atualizar o SDK para que `CwHypCollateralAdapter` sobrescreva `getBalance()` e use o contrato CW20 diretamente
2. Verificar se há uma versão mais recente do SDK que corrige isso
3. Reportar o bug para a equipe do Hyperlane

O YAML está correto - o problema está na implementação do SDK.
