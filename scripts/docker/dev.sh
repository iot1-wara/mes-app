#!/usr/bin/env bash
set -euo pipefail

# docker/dev.sh — Startet die Dev-Infrastruktur (PostgreSQL + optional MQTT)
# Usage: ./scripts/docker/dev.sh [up|down|status|logs]

ACTION="${1:-status}"

case "$ACTION" in
  up)
    echo "Starting MES Infrastructure..."
    docker compose -f docker-compose.infra.yml up -d
    
    # Wait for PostgreSQL health
    echo ""
    echo "Waiting for PostgreSQL to be ready..."
    for i in $(seq 1 30); do
      if docker exec mes_db pg_isready -U mes_admin > /dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
      fi
      sleep 1
    done
    ;;

  down)
    echo "Stopping MES Infrastructure..."
    docker compose -f docker-compose.infra.yml down
    ;;

  status)
    docker compose -f docker-compose.infra.yml ps
    ;;

  logs)
    docker compose -f docker-compose.infra.yml logs -f
    ;;

  *)
    echo "Usage: $0 [up|down|status|logs]"
    exit 1
    ;;
esac
