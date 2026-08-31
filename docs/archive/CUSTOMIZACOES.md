# Documentação de Customizações - Hyperlane Warp UI

Este documento descreve todas as customizações implementadas no template do Hyperlane Warp UI para suportar tokens CW20 como colateral e transações multi-message no Cosmos.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquivos Custom Criados](#arquivos-custom-criados)
3. [Alterações no Core Original](#alterações-no-core-original)
4. [Features Implementadas](#features-implementadas)
5. [Como Funciona](#como-funciona)

---

## 🎯 Visão Geral

### Problemas Resolvidos

1. **Suporte a Tokens CW20 como Colateral**
   - O SDK original não suportava tokens CW20 como colateral em warp routes
   - Erro: "Approve not required for native tokens" mesmo quando `isApproveRequired()` retornava `true`

2. **Transações Multi-Message no Cosmos**
   - O widget original não suportava múltiplas mensagens em uma única transação
   - Resultado: duas aprovações separadas (approval + transfer) em vez de uma única transação

### Solução

Criamos arquivos customizados que **estendem** as classes/funções do SDK e widget **sem modificar** os pacotes nativos, seguindo o padrão de extensibilidade do Hyperlane.

---

## 📁 Arquivos Custom Criados

### 1. `src/custom/adapters/CustomCosmWasmTokenAdapter.ts`

**Localização:** `src/custom/adapters/CustomCosmWasmTokenAdapter.ts`

**Descrição:** Adapter customizado que estende `CwHypCollateralAdapter` do SDK para suportar tokens CW20 como colateral.

**Classes Customizadas:**

#### `CwNativeTokenAdapter`
- Estende: `SDKCwNativeTokenAdapter` (do SDK)
- Propósito: Placeholder para futuras extensões
- Status: Mantém implementação original

#### `CwHypCollateralAdapter`
- Estende: `SDKCwHypCollateralAdapter` (do SDK)
- Propósito: Corrige bugs e adiciona suporte a CW20 como colateral

**Métodos Sobrescritos:**

1. **`populateTransferRemoteTx()`** (linhas 40-118)
   - **Problema Original:** SDK usava `collateralDenom` nos `funds`, mas para CW20 isso é um endereço de contrato, não um denom
   - **Solução:** Para tokens CW20, usa apenas `igpDenom` (taxas) nos funds, não inclui o endereço do contrato CW20
   - **Estrutura:**
     ```typescript
     if ('cw20' in tokenType || 'c_w20' in tokenType) {
       // Usa apenas igpDenom para taxas
       // NÃO inclui collateralDenom (endereço do contrato)
     }
     ```

2. **`getDenom()`** (linhas 124-183)
   - **Problema Original:** SDK esperava `tokenType.native.fungible.denom`, mas tokens CW20 retornam `tokenType.cw20`
   - **Solução:** Para tokens CW20, retorna o endereço do contrato colateral diretamente
   - **Fallback:** Se a query falhar, retorna `this.addresses.token` (endereço do contrato)

3. **`populateApproveTx()`** (linhas 195-255)
   - **Problema Original:** SDK lançava erro "Approve not required for native tokens" mesmo para CW20
   - **Solução:** Gera transação `increase_allowance` no contrato CW20 quando o colateral é CW20
   - **Estrutura da Transação:**
     ```typescript
     {
       contractAddress: this.addresses.token, // Contrato CW20 colateral
       msg: {
         increase_allowance: {
           spender: recipient, // Warp router
           amount: weiAmountOrId.toString(),
           expires: { never: {} }
         }
       },
       funds: [] // Não precisa de funds para increase_allowance
     }
     ```

**Dependências:**
- `@hyperlane-xyz/sdk` - Classes base
- `@hyperlane-xyz/utils` - Utilitários (addressToBytes32, strip0x)
- Logger customizado

---

### 2. `src/custom/TokenFactory.ts`

**Localização:** `src/custom/TokenFactory.ts`

**Descrição:** Factory customizado que cria tokens com adapters corrigidos, especialmente para `CwHypCollateral` com colateral CW20.

**Classe:**

#### `CustomTokenFactory`

**Método Estático:**

1. **`createToken()`** (linhas 26-84)
   - **Propósito:** Cria tokens com adapters customizados quando necessário
   - **Comportamento:**
     - Se for `TokenStandard.CwHypCollateral`: cria token e substitui o adapter pelo `CwHypCollateralAdapter` customizado
     - Para outros padrões: usa criação normal do SDK
   - **Uso:**
     ```typescript
     const token = CustomTokenFactory.createToken(
       chainName,
       TokenStandard.CwHypCollateral,
       addressOrDenom,
       multiProvider,
       {
         collateralAddressOrDenom: '...',
         name: '...',
         symbol: '...',
         decimals: 18,
       }
     );
     ```

**Nota:** Usa `@ts-ignore` para acessar propriedade privada `token.adapter` e substituir pelo adapter customizado.

---

### 3. `src/custom/useCustomToken.ts`

**Localização:** `src/custom/useCustomToken.ts`

**Descrição:** Hook React para criar tokens com adapters customizados a partir de um `IToken`.

**Função:**

#### `useCustomToken(token: IToken | undefined, multiProvider: MultiProtocolProvider | undefined): Token | undefined`

**Funcionalidade:**
- Recebe um `IToken` e retorna um `Token` com adapter customizado se necessário
- Se for `CwHypCollateral`, substitui o adapter pelo `CwHypCollateralAdapter` customizado
- Para outros padrões, retorna token normal
- Usa `useMemo` para otimização

**Uso:**
```typescript
const customToken = useCustomToken(originToken, multiProvider);
```

**Fallback:** Se houver erro ao criar adapter customizado, retorna token padrão com warning.

---

### 4. `src/custom/patchWarpCore.ts`

**Localização:** `src/custom/patchWarpCore.ts`

**Descrição:** Função que aplica adapters customizados automaticamente aos tokens do WarpCore após sua criação.

**Função:**

#### `patchWarpCore(warpCore: WarpCore, multiProvider: MultiProtocolProvider): WarpCore`

**Funcionalidade:**
- Itera sobre todos os tokens do WarpCore
- Para tokens `CwHypCollateral` com `collateralAddressOrDenom`, sobrescreve o método `getHypAdapter()`
- O método sobrescrito retorna o `CwHypCollateralAdapter` customizado
- Mantém o método original para outros casos

**Como Funciona:**
1. Percorre `warpCore.tokens`
2. Identifica tokens `CwHypCollateral` com colateral
3. Sobrescreve `token.getHypAdapter()` para retornar adapter customizado
4. Loga quantos tokens foram patchados

**Uso:**
```typescript
const warpCore = new WarpCore(multiProvider, configs);
const patchedWarpCore = patchWarpCore(warpCore, multiProvider);
```

**Integração:**
- Usado automaticamente em `src/features/store.ts` (linha 249-250)
- Aplicado após criar o WarpCore em `initWarpContext()`
- Garante que todos os tokens `CwHypCollateral` usem o adapter customizado

**Nota:** Usa `@ts-ignore` para sobrescrever método do Token.

---

### 5. `src/custom/useCustomCosmosTransactionFns.ts`

**Localização:** `src/custom/useCustomCosmosTransactionFns.ts`

**Descrição:** Hook customizado que estende `useCosmosTransactionFns` do widget para suportar transações multi-message no Cosmos.

**Função Principal:**

#### `useCustomCosmosTransactionFns(multiProvider: MultiProtocolProvider)`

**Funcionalidade:**
- Usa o hook original `useTransactionFns` do widget
- Sobrescreve apenas o método `sendTransaction` para protocolos Cosmos
- Detecta quando `tx.transaction` é um array e chama `executeMultiple` diretamente

**Método Customizado:**

1. **`customSendTransaction`** (linhas 59-120)
   - **Detecção:** Verifica se `tx.type === ProviderType.CosmJsWasm` e se `tx.transaction` é um array
   - **Comportamento:**
     - Se for array: chama `executeMultiple` diretamente com o array de mensagens
     - Se não for array: delega para a função original do widget
   - **Estrutura:**
     ```typescript
     if (tx.type === ProviderType.CosmJsWasm && Array.isArray(tx.transaction)) {
       // Chama executeMultiple diretamente com o array
       await client.executeMultiple(address, tx.transaction, 'auto');
     } else {
       // Usa função original
       return cosmosFns.sendTransaction({ tx, chainName, activeChainName });
     }
     ```

**Função Helper:**

#### `getCosmosChainNames(multiProvider: MultiProtocolProvider): string[]`
- **Propósito:** Replica a lógica interna do widget para obter nomes das chains do Cosmos
- **Implementação:**
  ```typescript
  const cosmosChains = [
    ...getChainsForProtocol(multiProvider, ProtocolType.Cosmos),
    ...getChainsForProtocol(multiProvider, ProtocolType.CosmosNative),
    cosmoshub,
  ];
  return cosmosChains.map((c) => c.name);
  ```

**Dependências:**
- `@hyperlane-xyz/widgets` - Hooks originais
- `@hyperlane-xyz/sdk` - Tipos
- `@hyperlane-xyz/utils` - ProtocolType, assert
- `@hyperlane-xyz/registry` - cosmoshub
- `@cosmos-kit/react` - useChains

---

## 🔧 Alterações no Core Original

### Nenhuma Alteração no Core

**Importante:** Nenhum arquivo do pacote `@hyperlane-xyz/sdk` ou `@hyperlane-xyz/widgets` foi modificado diretamente.

Todas as customizações foram feitas através de:
1. **Extensão de Classes** (CustomCosmWasmTokenAdapter)
2. **Hooks Customizados** (useCustomCosmosTransactionFns)
3. **Substituição de Adapters** (via TokenFactory customizado)

---

## ✨ Features Implementadas

### 1. Suporte a Tokens CW20 como Colateral

**Arquivo:** `src/custom/adapters/CustomCosmWasmTokenAdapter.ts`

**Funcionalidades:**
- ✅ Detecta automaticamente se o colateral é CW20
- ✅ Gera transações de aprovação (`increase_allowance`) para tokens CW20
- ✅ Corrige o uso de `funds` em transações de transferência remota
- ✅ Retorna o endereço do contrato quando `getDenom()` é chamado para CW20

**Como Funciona:**
1. O adapter verifica o tipo do token através de `getTokenType()`
2. Se for CW20, usa lógica customizada
3. Se não for CW20, delega para a implementação do SDK (comportamento original)

---

### 2. Transações Multi-Message no Cosmos

**Arquivo:** `src/custom/useCustomCosmosTransactionFns.ts`

**Funcionalidades:**
- ✅ Detecta quando `tx.transaction` é um array de mensagens
- ✅ Executa múltiplas mensagens em uma única transação usando `executeMultiple`
- ✅ Mantém compatibilidade com transações simples (não-arrays)

**Como Funciona:**
1. O hook intercepta chamadas de `sendTransaction` para protocolos Cosmos
2. Verifica se `tx.transaction` é um array
3. Se for array, chama `executeMultiple` diretamente
4. Se não for array, usa a função original do widget

---

### 3. Integração no Fluxo de Transferência

**Arquivo:** `src/features/transfer/useTokenTransfer.ts`

**Alterações:**

1. **Import do Hook Customizado** (linha 14)
   ```typescript
   import { useCustomCosmosTransactionFns } from '../../custom/useCustomCosmosTransactionFns';
   ```

2. **Uso do Hook Customizado** (linha 47)
   ```typescript
   // ANTES:
   const transactionFns = useTransactionFns(multiProvider);
   
   // DEPOIS:
   const transactionFns = useCustomCosmosTransactionFns(multiProvider);
   ```

3. **Lógica para Combinar Transações** (linhas 198-273)
   - Detecta protocolos Cosmos
   - Filtra transações de Approval e Transfer
   - Combina em um array de mensagens
   - Passa o array diretamente como `transaction`

**Estrutura do Array de Mensagens:**
```typescript
combinedMsgs = [
  {
    contractAddress: "endereco_contrato_cw20",
    msg: { increase_allowance: {...} },
    funds: []
  },
  {
    contractAddress: "endereco_warp_router",
    msg: { transfer_remote: {...} },
    funds: [{ amount: "1000", denom: "uluna" }]
  }
]
```

---

## 🔄 Como Funciona

### Fluxo Completo

1. **Usuário Inicia Transferência**
   - Preenche formulário de transferência
   - Seleciona token CW20 como colateral

2. **WarpCore Gera Transações**
   - `getTransferRemoteTxs()` retorna array de transações
   - Inclui: Approval (se necessário) + Transfer

3. **useTokenTransfer Detecta Cosmos**
   - Verifica se é protocolo Cosmos
   - Filtra transações de Approval e Transfer

4. **Combina Mensagens**
   - Cria array `combinedMsgs` com todas as mensagens
   - Cada mensagem tem: `contractAddress`, `msg`, `funds`

5. **Cria Transação Combinada**
   ```typescript
   const combinedTx = {
     ...baseTx,
     category: WarpTxCategory.Transfer,
     transaction: combinedMsgs, // Array de mensagens
   };
   ```

6. **useCustomCosmosTransactionFns Intercepta**
   - Detecta que `tx.transaction` é um array
   - Chama `executeMultiple` diretamente
   - Executa todas as mensagens em uma única transação

7. **Resultado**
   - ✅ Uma única aprovação da carteira
   - ✅ Uma única transação na blockchain
   - ✅ Approval + Transfer executados juntos

---

## 📊 Resumo das Alterações

### Arquivos Criados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/custom/adapters/CustomCosmWasmTokenAdapter.ts` | Adapter | Suporte a CW20 como colateral |
| `src/custom/TokenFactory.ts` | Factory | Cria tokens com adapters customizados |
| `src/custom/useCustomToken.ts` | Hook | Hook React para tokens customizados |
| `src/custom/patchWarpCore.ts` | Patch | Aplica adapters customizados ao WarpCore |
| `src/custom/useCustomCosmosTransactionFns.ts` | Hook | Suporte a transações multi-message |

### Arquivos Modificados

| Arquivo | Alterações | Linhas |
|---------|------------|--------|
| `src/features/transfer/useTokenTransfer.ts` | Import e uso do hook customizado + lógica de combinação | 14, 47, 198-273 |
| `src/features/store.ts` | Import e aplicação do patchWarpCore após criar WarpCore | 249-250 |

### Arquivos do Core

| Status | Descrição |
|--------|-----------|
| ✅ **Nenhum modificado** | Todas as customizações são extensões, não modificações |

---

## 🎯 Benefícios

1. **Sem Modificações no Core**
   - Pacotes nativos permanecem intactos
   - Atualizações do SDK/widget não quebram customizações
   - Fácil manutenção

2. **Padrão de Extensibilidade**
   - Segue o mesmo padrão do Hyperlane
   - Similar a `CustomCosmWasmTokenAdapter.ts`
   - Código organizado em `src/custom/`

3. **Compatibilidade**
   - Funciona com tokens nativos (comportamento original)
   - Funciona com tokens CW20 (novo comportamento)
   - Transações simples continuam funcionando

4. **UX Melhorada**
   - Uma única aprovação em vez de duas
   - Transação mais rápida (menos interações)
   - Menos confusão para o usuário

---

## 🔍 Detalhes Técnicos

### Estrutura de Mensagens CosmWasm

Cada mensagem no array tem a estrutura:
```typescript
{
  contractAddress: string,  // Endereço do contrato
  msg: object,              // Mensagem do contrato (increase_allowance, transfer_remote, etc.)
  funds: Array<{            // Fundos nativos (para taxas)
    amount: string,
    denom: string
  }>
}
```

### Detecção de Protocolo Cosmos

```typescript
const isCosmosProtocol =
  originProtocol === ProtocolType.Cosmos ||
  originProtocol === ProtocolType.CosmosNative ||
  (txs.length > 0 &&
    (txs[0].type === ProviderType.CosmJsWasm ||
     txs[0].type === ProviderType.CosmJsNative ||
     txs[0].type === ProviderType.CosmJs));
```

### Combinação de Funds

Os funds são combinados e deduplicados:
- Funds do mesmo `denom` são somados
- Apenas a última mensagem (transfer) recebe os funds combinados
- Funds de approval são vazios (não precisam de taxas)

---

## 📝 Notas Importantes

1. **Tokens CW20 como Colateral**
   - Requer que o contrato warp retorne o tipo correto em `token_type`
   - O adapter faz fallback para o endereço do contrato se a query falhar

2. **Transações Multi-Message**
   - Funciona apenas para `ProviderType.CosmJsWasm`
   - Transações simples (não-arrays) continuam usando a função original
   - Requer que a carteira suporte `executeMultiple`

3. **Compatibilidade**
   - Todas as customizações são retrocompatíveis
   - Tokens nativos continuam funcionando normalmente
   - Outros protocolos (Ethereum, Solana, etc.) não são afetados

---

## 🚀 Próximos Passos (Opcional)

1. **Testes Unitários**
   - Testar `CustomCosmWasmTokenAdapter` com diferentes tipos de tokens
   - Testar `useCustomCosmosTransactionFns` com arrays e objetos simples

2. **Documentação Adicional**
   - Adicionar exemplos de uso
   - Documentar casos de borda

3. **Otimizações**
   - Cache de queries de `getTokenType()`
   - Validação de estrutura de mensagens antes de enviar

---

## 📚 Referências

- [Hyperlane SDK Documentation](https://docs.hyperlane.xyz/)
- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [Cosmos Kit Documentation](https://cosmos-kit.js.org/)

---

**Última Atualização:** 2025-02-13
**Versão:** 1.0.0
