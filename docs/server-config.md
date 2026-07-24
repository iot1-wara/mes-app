# MES Server Konfiguration (Staging & Production)

## Überblick

| Ebene | Host/Access     | DB                 | PM2 Name      | PM2 Env Flag  |
|-------|-----------------|--------------------|---------------|---------------|
| Staging   | SSH via GH Secret | Docker Postgres    | mes-staging   | `--env staging` |
| Production | SSH via GH Secret | Docker Postgres   | mes-gateway   | `--env production` |

---

## Server-Voraussetzungen (beide Umgebungen)

### System Requirements
- Ubuntu 22.04 LTS oder neuer
- 2+ CPU Cores, 4GB RAM minimum
- Node.js 20.x (via nvm)
- Docker + Docker Compose Plugin
- PM2 (global installed)
- Nginx (als Reverse Proxy)

### Required Software
```bash
# Install all dependencies in one go
sudo apt update && sudo apt install -y curl git ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pm2
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

## 1. Application Deployment (beide Umgebungen)

### Schritt 1: App auf Server klonen
```bash
# SSH in den Server verbinden
ssh user@server_ip

# Workspace erstellen
mkdir -p /opt/mes-app && cd /opt/mes-app

# Repository klonen (oder rsync von lokalem dev machine)
git clone git@github.com:yourorg/mes-app.git .
```

### Schritt 2: Environment Datei erstellen
```bash
# Staging
cat > /opt/mes-app/.env <<EOF
NODE_ENV=staging
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=m_mes_staging
DB_PASSWORD=<strong_random_password>
DB_DATABASE=mes_production_staging
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=86400
MQTT_BROKER_URL=mqtt://localhost:1883
OPCUA_ENDPOINT_URL=opc.tcp://plc.internal:4840
EOF

# Production
cat > /opt/mes-app/.env.production <<EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=m_mes_prod
DB_PASSWORD=<strong_random_password>
DB_DATABASE=mes_production
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=86400
MQTT_BROKER_URL=mqtt://mqtt.prod.internal:1883
OPCUA_ENDPOINT_URL=opc.tcp://plc-prod.internal:4840
EOF
```

### Schritt 3: Infrastruktur starten (beide Umgebungen identisch)
```bash
# PostgreSQL + MQTT via Docker Compose
cd /opt/mes-app
docker compose -f docker-compose.infra.yml up -d
```

### Schritt 4: Nginx Reverse Proxy konfigurieren
```bash
sudo tee /etc/nginx/sites-available/mes <<'EOF'
upstream mes_backend {
    server 127.0.0.1:3060;
}

server {
    listen 80;
    server_name staging.mes.local mes-staging.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.mes.local mes-staging.internal;

    ssl_certificate     /etc/letsencrypt/live/staging.mes.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.mes.local/privkey.pem;

    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=63072000" always;

    location /api/ {
        proxy_pass http://mes_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    location /edge/ws {
        proxy_pass http://mes_backend/edge/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://mes_backend/;
        proxy_set_header Host $host;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/mes /etc/nginx/sites-enabled/mes
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### Schritt 5: PM2 starten und konfigurieren
```bash
cd /opt/mes-app
pm2 start ecosystem.config.js --env staging   # oder production
pm2 save
pm2 startup ubuntu    # Autostart bei reboot
```

---

## 2. Production vs. Staging — Unterschiede

| Feature | Staging | Production |
|---------|---------|------------|
| PM2 Instanzen | 1 (`instances: 1`) | Max (CPU Cores) |
| DB Name | `mes_production_staging` | `mes_production` |
| Data Volume | `staging_data` | `prod_data` (SSD) |
| SSL Certificate | Let's Encrypt (test) | Let's Encrypt (prod) + auto-renew |
| Backup | Täglich 02:00 UTC | Jeder 4h, 30-day retention |
| Monitoring | pm2 monit | PM2 Plus oder Grafana + Prometheus |

### Production-Only: Database Backup Script
```bash
# /opt/mes-app/scripts/backup.sh
#!/bin/bash
set -euo pipefail
BACKUP_DIR="/var/backups/mes-db"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Dump production database
docker exec mes_db pg_dump -U mes_admin mes_production \
  > "$BACKUP_DIR/mes_backup_$DATE.sql.gz"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "mes_backup_*.sql.gz" -mtime +30 -delete

echo "[Backup] Done: $BACKUP_DIR/mes_backup_$DATE.sql.gz"
```

### Production-Only: SSL auto-renew (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mes.yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com --redirect
# Auto-renew via cron
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

---

## 3. Monitoring & Alerting

### PM2 Monitoring
```bash
pm2 monit                    # Live CPU/Memory/Logs
pm2 list                     # Process status
pm2 log mes-staging          # Einzelne Logs sehen
```

### Health-Checks (automatisch in Cron)
```bash
# /opt/mes-app/scripts/healthcheck.sh
#!/bin/bash
RESULT=$(curl -sf http://localhost:3000/api/edge/health | jq -e '.status == "ok"' 2>/dev/null)

if [ "$RESULT" != "true" ]; then
    echo "[ALERT] MES Health Check FAILED at $(date)" | mail -s "MES DOWN" admin@yourdomain.com
    pm2 restart mes-staging   # Auto-recovery attempt
fi
```

---

## Deployment Timeline

```
Day 0: Server Setup (Ubuntu, Node, Docker, PM2)
  │
Day 1: Staging Deployment
  ├── Git clone + .env erstellen
  ├── Infrastruktur (Postgres + MQTT) starten
  ├── Nginx Reverse Proxy konfigurieren
  └── PM2 deploy --env staging
  │
Day 2-5: Manual QA auf Staging
  ├── Feature Testing
  ├── User Acceptance
  └── Performance Testing (10+ simultane User)
  │
Day 6: Production Deployment (nach Freigabe durch Team Lead)
  ├── Identischer Process wie Staging
  └── Parallel Logs im pm2 monit tracken
```

---

Ende der Server-Konfiguration.
