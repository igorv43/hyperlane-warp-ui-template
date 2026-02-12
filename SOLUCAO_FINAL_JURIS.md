# Solução Final: JURIS com CW20 como Colateral

## Situação Atual

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

## O Problema

O SDK do Hyperlane espera que quando você faz a query `token_default.token_type` no contrato warp, ele retorne:
```json
{
  "type": {
    "native": {
      "fungible": {
        "denom": "uluna"  // Denom nativo usado para pagar taxas
      }
    }
  }
}
```

Mas o contrato JURIS retorna:
```json
{
  "type": "cw20"  // ❌ SDK não suporta isso
}
```

## Por Que Isso Acontece?

O método `getDenom()` no `CwHypNativeAdapter` (usado por `CwHypCollateralAdapter`) precisa do denom nativo para:
1. **Pagar taxas** nas transações (interchain gas)
2. **Buscar balance** do denom nativo usado para taxas

Mesmo que o colateral seja um CW20, as taxas ainda precisam ser pagas em um denom nativo (como `uluna`).

## Soluções

### Solução 1: Contrato Warp Retornar Denom Nativo (Recomendado)

O contrato warp precisa ser configurado para retornar o denom nativo no `token_type`, mesmo quando usa CW20 como colateral.

**O contrato warp deve:**
- Manter a configuração `type: "cw20"` e `collateral.address` para o funcionamento interno
- Mas quando consultado via `token_default.token_type`, retornar `{ "native": { "fungible": { "denom": "uluna" } } }`

Isso requer uma atualização no contrato warp para suportar essa funcionalidade.

### Solução 2: Usar Token Nativo como Colateral

Se possível, reconfigurar o contrato warp para usar um token nativo como colateral:

```json
{
  "type": "native",
  "mode": "collateral",
  "config": {
    "collateral": {
      "denom": "uluna"
    }
  }
}
```

E no YAML:
```yaml
collateralAddressOrDenom: "uluna"  # Denom nativo
```

### Solução 3: Aguardar Atualização do SDK

O SDK atual não suporta diretamente CW20 como colateral quando o `token_type` retorna `cw20`. Seria necessário:
- Atualizar o SDK para suportar `token_type: "cw20"` e obter o denom de taxas de outra forma
- Ou criar um adapter específico para esse caso

## YAML Correto (Atual)

O YAML está correto como está:

```yaml
JURIS/terraclassictestnet-solanatestnet:
  tokens:
    - addressOrDenom: "terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l"
      chainName: "terraclassictestnet"
      standard: "CwHypCollateral"  # ✅ Correto
      collateralAddressOrDenom: "terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e"  # ✅ Endereço do CW20 colateral
      connections:
        - token: "sealevel|solanatestnet|G3eEYHv2GrBJ6KTS3XQhRd7QYdwnfWjisQrSVWedQK4y"
      decimals: 6
      logoURI: "https://raw.githubusercontent.com/JurisProtocol/assets/refs/heads/main/jurislogo.png"
      name: "Juris Protocol"
      symbol: "JURIS"
```

## Conclusão

**O problema está no contrato warp, não no YAML.**

O contrato warp precisa retornar um denom nativo no `token_type` query, mesmo que use CW20 como colateral. Isso é necessário porque:

1. As taxas são pagas em denom nativo (não em CW20)
2. O SDK precisa saber qual denom usar para pagar taxas
3. O `getDenom()` é usado para buscar o balance do denom de taxas

**Ação necessária:** Atualizar o contrato warp para retornar o denom nativo no `token_type`, ou reconfigurar para usar token nativo como colateral.
