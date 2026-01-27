#!/bin/sh
set -e

# Garantir que PORT e HOSTNAME estão definidos
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

# Log para debug
echo "Starting Next.js server..."
echo "PORT: $PORT"
echo "HOSTNAME: $HOSTNAME"
echo "NODE_ENV: $NODE_ENV"

# Verificar se server.js existe
if [ ! -f "server.js" ]; then
  echo "ERROR: server.js not found!"
  ls -la
  exit 1
fi

# Iniciar o servidor
exec node server.js
