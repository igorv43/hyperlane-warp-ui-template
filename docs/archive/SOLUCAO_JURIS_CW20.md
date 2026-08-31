# Solução: JURIS é um Token CW20 em Warp Route

## Entendendo os Padrões

### `CW20` vs `CwHypCollateral`

1. **`CW20`** - Para tokens CW20 simples (NÃO warp routes)
   - Usa `CwTokenAdapter`
   - Não tem suporte para warp routes
   - Não pode fazer transferências interchain

2. **`CwHypCollateral`** - Para tokens CW20 que fazem parte de warp routes
   - O token em si é um CW20
   - Mas está dentro de uma warp route do Hyperlane
   - Usa `CwHypCollateralAdapter` que estende `CwHypNativeAdapter`

## O Problema com JURIS

O JURIS é um token CW20 que está em uma warp route. Ele DEVE usar `CwHypCollateral`, mas há um problema:

### Como `CwHypCollateral` Funciona

1. O `CwHypCollateralAdapter` recebe:
   - `warpRouter`: endereço do contrato warp (o `addressOrDenom` do token)
   - `token`: endereço do token colateral (o `collateralAddressOrDenom`)

2. Quando chama `getDenom()`, ele:
   - Faz query `token_default` → `token_type` no contrato warp
   - Espera receber: `{ "native": { "fungible": { "denom": "uluna" } } }`
   - Mas o contrato JURIS provavelmente retorna: `{ "cw20": { "address": "..." } }`

### O Que o Contrato Warp Precisa Retornar

O contrato warp do JURIS precisa estar configurado para retornar um **denom nativo** quando consultado via `token_type`, mesmo que internamente use um CW20 como colateral.

**Query esperada:**
```json
{
  "token_default": {
    "token_type": {}
  }
}
```

**Resposta esperada:**
```json
{
  "type": {
    "native": {
      "fungible": {
        "denom": "uluna"  // ou outro denom nativo
      }
    }
  }
}
```

## Solução

### Opção 1: Contrato Warp Configurado Corretamente (Recomendado)

O contrato warp precisa retornar um denom nativo no `token_type`, mesmo que use CW20 como colateral. Isso é uma configuração do contrato warp, não do YAML.

**YAML correto:**
```yaml
JURIS/terraclassictestnet-solanatestnet:
  tokens:
    - addressOrDenom: "terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l"
      chainName: "terraclassictestnet"
      standard: "CwHypCollateral"  # ✅ Correto para CW20 em warp route
      collateralAddressOrDenom: "terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e"  # Endereço do CW20 colateral
      connections:
        - token: "sealevel|solanatestnet|G3eEYHv2GrBJ6KTS3XQhRd7QYdwnfWjisQrSVWedQK4y"
      decimals: 6
      logoURI: "https://raw.githubusercontent.com/JurisProtocol/assets/refs/heads/main/jurislogo.png"
      name: "Juris Protocol"
      symbol: "JURIS"
```

**Mas o contrato warp precisa retornar:**
- `token_type` → `{ "native": { "fungible": { "denom": "uluna" } } }`

### Opção 2: Verificar Configuração do Contrato

Se o contrato warp não pode ser alterado, verifique:

1. **O contrato foi deployado com o tipo correto?**
   - Deve ser um contrato warp que suporta `CwHypCollateral`
   - Não pode ser um contrato CW20 simples

2. **O `token_default.token_type` retorna o que?**
   - Se retorna `cw20`, o contrato não está configurado corretamente
   - Precisa retornar `native` com um denom

## Quando Usar Cada Padrão

| Situação | Padrão a Usar |
|----------|---------------|
| Token CW20 simples (não warp route) | `CW20` |
| Token CW20 em warp route (colateral) | `CwHypCollateral` |
| Token CW20 em warp route (sintético) | `CwHypSynthetic` |
| Token nativo em warp route | `CwHypNative` |

## Conclusão

**JURIS DEVE usar `CwHypCollateral`** porque é um token CW20 em uma warp route.

O problema está na **configuração do contrato warp**, não no YAML. O contrato warp precisa retornar um denom nativo no `token_type`, mesmo que use CW20 como colateral internamente.

Se o contrato não pode ser alterado e retorna `cw20` no `token_type`, então o SDK atual não suporta esse caso e seria necessário:
1. Atualizar o contrato warp para retornar o tipo correto
2. Ou aguardar uma atualização do SDK que suporte CW20 como colateral diretamente
