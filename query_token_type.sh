#!/bin/bash

# Script para consultar token_type do contrato warp JURIS no Terra Classic Testnet
# Contrato: terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l

CONTRACT_ADDRESS="terra1stu3cl7mhtsc2mf9cputawfd6v6e4a2nkmhhphh47lsrr3j6ktdqlcfe2l"
LCD_ENDPOINT="https://lcd.luncblaze.com"
RPC_ENDPOINT="https://rpc.luncblaze.com"

# Query usando LCD (REST API)
echo "Consultando token_type do contrato warp JURIS..."
echo "Contrato: $CONTRACT_ADDRESS"
echo "LCD: $LCD_ENDPOINT"
echo ""

QUERY_MSG='{"token_default":{"token_type":{}}}'

echo "=== Método 1: Usando LCD (REST API) ==="
curl -X GET "$LCD_ENDPOINT/cosmwasm/wasm/v1/contract/$CONTRACT_ADDRESS/smart/$(echo -n "$QUERY_MSG" | base64 -w 0)" \
  -H "Content-Type: application/json" \
  2>/dev/null | jq '.' || echo "Erro na query LCD"

echo ""
echo "=== Método 2: Usando LCD com POST ==="
curl -X POST "$LCD_ENDPOINT/cosmwasm/wasm/v1/contract/$CONTRACT_ADDRESS/smart" \
  -H "Content-Type: application/json" \
  -d "{\"query_msg\": $QUERY_MSG}" \
  2>/dev/null | jq '.' || echo "Erro na query LCD POST"

echo ""
echo "=== Método 3: Usando terrad (se instalado) ==="
echo "terrad query wasm contract-state smart $CONTRACT_ADDRESS '$QUERY_MSG' --node $RPC_ENDPOINT"
