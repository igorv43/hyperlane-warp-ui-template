# Correção do Erro JURIS - Token type not supported

## Problema
Erro: `Token type not supported: [object Object]` em `getDenom` ao tentar buscar balance do token JURIS.

## Causa
O erro `[object Object]` indica que algum campo no YAML remoto está sendo parseado como objeto ao invés de string. Isso pode acontecer quando:

1. Campos não estão entre aspas no YAML
2. Estrutura YAML está incorreta (indentação, formatação)
3. Algum campo está sendo parseado incorretamente

## Solução

### 1. Verificar que TODOS os campos de string estão entre aspas

No YAML remoto, certifique-se de que **TODOS** os campos de string estejam entre aspas:

```yaml
JURIS/terraclassictestnet-solanatestnet:
  tokens:
    - addressOrDenom: "terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l"  # ✅ COM ASPAS
      chainName: "terraclassictestnet"  # ✅ COM ASPAS
      standard: "CwHypCollateral"  # ✅ COM ASPAS
      collateralAddressOrDenom: "terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e"  # ✅ COM ASPAS
      connections:
        - token: "sealevel|solanatestnet|G3eEYHv2GrBJ6KTS3XQhRd7QYdwnfWjisQrSVWedQK4y"  # ✅ COM ASPAS
      decimals: 6  # ✅ SEM ASPAS (número)
      logoURI: "https://raw.githubusercontent.com/JurisProtocol/assets/refs/heads/main/jurislogo.png"  # ✅ COM ASPAS
      name: "Juris Protocol"  # ✅ COM ASPAS
      symbol: "JURIS"  # ✅ COM ASPAS
```

### 2. Estrutura Correta do JURIS

```yaml
JURIS/terraclassictestnet-solanatestnet:
  tokens:
    - addressOrDenom: "terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l"
      chainName: "terraclassictestnet"
      standard: "CwHypCollateral"
      collateralAddressOrDenom: "terra1w7d0jqehn0ja3hkzsm0psk6z2hjz06lsq0nxnwkzkkq4fqwgq6tqa5te8e"
      connections:
        - token: "sealevel|solanatestnet|G3eEYHv2GrBJ6KTS3XQhRd7QYdwnfWjisQrSVWedQK4y"
      decimals: 6
      logoURI: "https://raw.githubusercontent.com/JurisProtocol/assets/refs/heads/main/jurislogo.png"
      name: "Juris Protocol"
      symbol: "JURIS"
    - addressOrDenom: "G3eEYHv2GrBJ6KTS3XQhRd7QYdwnfWjisQrSVWedQK4y"
      chainName: "solanatestnet"
      standard: "SealevelHypSynthetic"
      collateralAddressOrDenom: "GDzqsfF9NHdeZXNnWZrjxFhzyUaCgG7PsBSz2Nr89xdy"
      connections:
        - token: "cosmos|terraclassictestnet|terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l"
      decimals: 6
      logoURI: "https://raw.githubusercontent.com/JurisProtocol/assets/refs/heads/main/jurislogo.png"
      name: "Juris Protocol"
      symbol: "JURIS"
  options:
    interchainFeeConstants:
      - origin: "terraclassictestnet"
        destination: "solanatestnet"
        amount: 1780832150
        addressOrDenom: "uluna"
    localFeeConstants:
      - origin: "terraclassictestnet"
        destination: "solanatestnet"
        amount: 383215
```

### 3. Pontos Importantes

- ✅ `standard: "CwHypCollateral"` (não `"Cw20"`)
- ✅ `collateralAddressOrDenom` deve ser o endereço do token colateral (contrato CW20), não `uluna`
- ✅ Todos os campos de string devem estar entre aspas
- ✅ `decimals` e `amount` são números (sem aspas)
- ✅ Estrutura YAML deve ter indentação correta (2 espaços)

### 4. Verificação

Após atualizar o YAML no repositório remoto, verifique:

1. O arquivo YAML está válido (use um validador YAML online)
2. Todos os campos de string estão entre aspas
3. A indentação está correta
4. Não há caracteres especiais ou problemas de encoding

### 5. Debug

Se o erro persistir, verifique no console do navegador:
- Qual campo está vindo como objeto
- Se o YAML está sendo parseado corretamente
- Se há erros de validação do schema
