# Changelog - Customizações do SDK

## [1.0.0] - 2024

### Adicionado

#### Novos Arquivos
- `src/custom/adapters/CustomCosmWasmTokenAdapter.ts`
  - `CustomCwTokenAdapter` - Corrige `getBalance()` para CW20
  - `CustomCwHypCollateralAdapter` - Suporta CW20 como colateral

- `src/custom/adapters/index.ts`
  - Exports das classes customizadas

- `src/custom/patchWarpCore.ts`
  - Função para aplicar correções automaticamente

- `src/custom/TokenFactory.ts`
  - Factory para criar tokens customizados manualmente

- `src/custom/useCustomToken.ts`
  - Hook React para usar tokens customizados

- `src/custom/README.md`
  - Documentação das customizações

- `src/custom/EXEMPLO_USO.md`
  - Exemplos de uso

- `CUSTOMIZACOES_SDK.md`
  - Documentação completa para desenvolvedores e auditores

- `CUSTOMIZACOES_RESUMO.md`
  - Resumo executivo

- `CHANGELOG_CUSTOMIZACOES.md`
  - Este arquivo

#### Modificações

- `src/features/store.ts`
  - **Linha ~246:** Adicionado patch automático após criar WarpCore
  - **Código adicionado:**
    ```typescript
    const { patchWarpCore } = await import('../../custom/patchWarpCore');
    patchWarpCore(warpCore, multiProvider);
    ```

### Corrigido

- ✅ `CwTokenAdapter.getBalance()` agora usa `queryToken` corretamente
- ✅ `CwHypCollateralAdapter` agora suporta CW20 como colateral
- ✅ Erro "Token type not supported" resolvido para tokens CW20

### Impacto

- **Tokens Afetados:** Apenas tokens `CwHypCollateral` com colateral CW20
- **Funcionalidades:** Balance e transferências agora funcionam corretamente
- **Compatibilidade:** 100% compatível com SDK original

### Notas Técnicas

- Nenhum arquivo em `node_modules` foi modificado
- Todas as customizações são aplicadas em tempo de execução
- Fallbacks implementados para garantir estabilidade
- Logs adicionados para debugging

---

## Como Usar Este Changelog

Este changelog documenta todas as customizações aplicadas ao SDK. Use-o para:

1. **Rastreamento:** Saber exatamente o que foi modificado
2. **Auditoria:** Verificar mudanças para segurança
3. **Manutenção:** Entender o que remover quando SDK corrigir
4. **Onboarding:** Ajudar novos desenvolvedores a entender as customizações

---

## Próximas Versões

Quando o SDK oficial corrigir os bugs, esta seção será atualizada com:

- Data de remoção das customizações
- Versão do SDK que corrigiu os bugs
- Arquivos removidos
- Testes realizados
