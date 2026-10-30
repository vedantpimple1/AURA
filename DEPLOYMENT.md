# KAI AURA — AZURE CLOUD PRODUCTION DEPLOYMENT GUIDE
**System Name:** KAI Aura (Enterprise Gamification, Peer Recognition & Rewards Platform)  
**Target Cloud:** Microsoft Azure (Single Virtual Machine or Decoupled Services)  
**Standard VM Profile:** Azure VM `Standard_B2ms` · 2 vCPU · 8 GB RAM · 64 GB Premium SSD  
**Operating System:** Ubuntu Server 22.04 LTS / 24.04 LTS x64  
**Target Capacity:** 30–40 active cohort (architecturally scalable to 500+ users)  
**Security Standard:** Zero Secret Exposure · OWASP ASVS Level 2 · Strict RBAC  
**Critical Infrastructure Policy:** **NO SMTP MAIL SERVER IS DEPLOYED ON AZURE** (Outbound port 25 is blocked by Azure; external cloud SMTP relays or In-App Database Polling are used exclusively).

---

## 1. ARCHITECTURAL OVERVIEW & SERVICE TOPOLOGY

The deployment hosts both the decoupled Next.js 16 frontend and Express.js backend on an Azure **Standard_B2ms** VM, fronted by an Nginx reverse proxy with automated Let's Encrypt TLS 1.3 termination.

### System Topology Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Azure VM Standard_B2ms · 2 vCPU · 8 GB RAM (Ubuntu 22.04 LTS)                                  │
│                                                                                                │
│                             Inbound HTTPS (443) / HTTP (80)                                    │
│                                            │                                                   │
│                                            ▼                                                   │
│                 ┌─────────────────────────────────────────────────────┐                        │
│                 │      Nginx + Let's Encrypt TLS 1.3 · ~50 MB RAM     │                        │
│                 │   SSL termination, static asset cache, forwarding   │                        │
│                 └──────────┬───────────────────────────────┬──────────┘                        │
│                            │                               │                                   │
│            location /      │                               │ location /api                     │
│                            ▼                               ▼                                   │
│  ┌───────────────────────────────────┐   ┌───────────────────────────────────┐                 │
│  │ Next.js 16.3.5 frontend ~250MB RAM│   │ Express.js API gateway ~140MB RAM │                 │
│  │ localhost:3000 · SSR & Turbopack  │   │ localhost:4000 · router & auth bus│                 │
│  └───────────────────────────────────┘   └─────────────────┬─────────────────┘                 │
│                                                            │                                   │
│                                                            ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Express.js domain services · RAM per service                                             │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  │
│  │  │   Auth / RBAC    │  │   Tasks engine   │  │   Aura ledger    │  │   Kudos / Teams  │  │  │
│  │  │   ~90 MB RAM     │  │   ~120 MB RAM    │  │   ~110 MB RAM    │  │   ~100 MB RAM    │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  │
│  │  │Store & Redemption│  │Password Recovery │  │  Notif & Email   │  │Observability & AI│  │  │
│  │  │   ~90 MB RAM     │  │   ~80 MB RAM     │  │   ~110 MB RAM    │  │ Audit & Gemini   │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                                 │ jobs / enqueue                               │
│                                                 ▼                                              │
│  ┌───────────────────────────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ Standalone Worker (worker.js) + Redis 7 · ~120 MB RAM │  │ Active base memory:  ~3.0 GB  │  │
│  │ BullMQ queue OR resilient DB Polling (every 10s)      │  │ Headroom & OS cache: ~5.0 GB  │  │
│  └──────────────────────────┬────────────────────────────┘  └───────────────────────────────┘  │
│                             │ SQL transactions & connection pooling                             │
│                             ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL 16 · Prisma ORM with @prisma/adapter-pg pool · ~800 MB - 1.2 GB RAM           │  │
│  │ 23 normalized relational models · port 5432 bound to localhost only                      │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Memory Footprint & Headroom Allocation

| Subsystem / Service | Role & Process | Bound Port | Base RAM | Peak Burst RAM |
| :--- | :--- | :--- | :--- | :--- |
| **Nginx Web Server** | Reverse proxy, static asset cache, TLS 1.3 | `:80`, `:443` | ~30 MB | ~50 MB |
| **Next.js Frontend** | App Router, SSR, Server Actions | `127.0.0.1:3000` | ~180 MB | ~280 MB |
| **Express Backend** | REST API gateway, 17 domain services | `127.0.0.1:4000` | ~140 MB | ~250 MB |
| **Delivery Worker** | Asynchronous email & notification processor | Internal | ~90 MB | ~140 MB |
| **Redis 7 Cache** | BullMQ queue state, concurrency locks | `127.0.0.1:6379` | ~35 MB | ~60 MB |
| **PostgreSQL 16** | 23 relational models, ACID transactions | `127.0.0.1:5432` | ~750 MB | ~1,200 MB |
| **Ubuntu Linux OS** | Kernel, systemd daemons, syslog, sshd | — | ~500 MB | ~700 MB |
| **TOTAL ACTIVE LOAD** | All services operating concurrently | — | **~1.72 GB** | **~2.68 GB** |
| **AVAILABLE HEADROOM**| Reserved for OS disk cache & sudden spikes | — | **> 5.3 GB** (on 8 GB VM) |

---

## 2. POLICY NOTICE: SMTP ON AZURE

> [!IMPORTANT]
> **DO NOT DEPLOY OR INSTALL AN SMTP SERVER (SUCH AS POSTFIX, EXIM, OR SENDMAIL) ON AZURE.**

1. **Outbound Port 25 Blocked:** Microsoft Azure strictly blocks outbound TCP connections on Port 25 across all compute instances to protect against IP reputation degradation and spam.
2. **External Authenticated Relay:** AURA's email engine (`backend/src/services/email.service.ts`) is designed to connect outbound over secure ports:
   - **Port 587 (STARTTLS)**: `SMTP_PORT=587`, `SMTP_SECURE="false"`
   - **Port 465 (SSL/TLS)**: `SMTP_PORT=465`, `SMTP_SECURE="true"`
   - Supported Relays: SendGrid, Amazon SES, Brevo, Mailgun, Resend, Microsoft 365 Exchange Online, or Google Workspace SMTP relay.
3. **Zero-SMTP In-App Fallback:** If email is not required immediately, AURA's **In-App Notification Center** operates 100% autonomously without any SMTP credentials. Setting `DELIVERY_WORKER_ENABLED="false"` or leaving SMTP blank logs notifications to the database and in-app bell without errors.

---

## 3. SYSTEM & RUNTIME DEPENDENCY CONSTRAINTS

| Technology | Target Version | Constraint Rule / Verification |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu Server 22.04 LTS / 24.04 LTS | x86_64 architecture |
| **Node.js Runtime** | `v20.18.0` LTS or higher | `node -v` (NodeSource LTS repository) |
| **NPM Package Manager**| `v10.8.0` or higher | `npm -v` |
| **PostgreSQL Engine** | `16.x` (or `15.x`) | `psql --version` |
| **Prisma ORM** | `7.10.0` | `@prisma/client` + `@prisma/adapter-pg` |
| **Next.js Framework**| `16.3.5` | App Router with Turbopack |
| **React** | `19.2.8` | Client & Server Components |
| **Express Engine** | `4.21.2` | Standalone backend API |
| **TypeScript** | `5.x` | Compiler & strict type verification |
| **Redis Server** | `7.x` | `redis-server --version` (Optional for BullMQ) |
| **Nginx** | `1.18.0+` | `nginx -v` |
| **Certbot** | `latest` (via Snap) | Let's Encrypt TLS 1.3 certificates |

---

## 4. AZURE CLOUD PROVISIONING (AZURE CLI / PORTAL)

Run the following commands using the Azure CLI (`az`) from your administrative workstation or Azure Cloud Shell:

### 1. Set Configuration Variables
```bash
RESOURCE_GROUP="rg-kai-aura-prod"
LOCATION="eastus" # Or centralindia, westeurope, etc.
VNET_NAME="vnet-kai-aura"
SUBNET_NAME="snet-kai-aura"
NSG_NAME="nsg-kai-aura"
PUBLIC_IP_NAME="pip-kai-aura"
VM_NAME="vm-kai-aura-prod"
VM_SIZE="Standard_B2ms"
ADMIN_USERNAME="azureuser"
```

### 2. Create Resource Group & Network
```bash
# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Network Security Group (NSG)
az network nsg create --resource-group $RESOURCE_GROUP --name $NSG_NAME --location $LOCATION

# Add Firewall Security Rules (Port 22 SSH, Port 80 HTTP, Port 443 HTTPS)
az network nsg rule create --resource-group $RESOURCE_GROUP --nsg-name $NSG_NAME \
  --name "Allow-SSH" --priority 1000 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 22 --source-address-prefixes "*"

az network nsg rule create --resource-group $RESOURCE_GROUP --nsg-name $NSG_NAME \
  --name "Allow-HTTP" --priority 1010 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 80 --source-address-prefixes "*"

az network nsg rule create --resource-group $RESOURCE_GROUP --nsg-name $NSG_NAME \
  --name "Allow-HTTPS" --priority 1020 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 443 --source-address-prefixes "*"

# Create Virtual Network & Subnet bound to the NSG
az network vnet create --resource-group $RESOURCE_GROUP --name $VNET_NAME \
  --address-prefix 10.0.0.0/16 --subnet-name $SUBNET_NAME --subnet-prefix 10.0.1.0/24 \
  --network-security-group $NSG_NAME

# Create Static Public IPv4
az network public-ip create --resource-group $RESOURCE_GROUP --name $PUBLIC_IP_NAME \
  --allocation-method Static --sku Standard --location $LOCATION
```

### 3. Deploy the Virtual Machine
```bash
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image "Canonical:0001-com-ubuntu-server-jammy:22_04-lts-gen2:latest" \
  --size $VM_SIZE \
  --admin-username $ADMIN_USERNAME \
  --generate-ssh-keys \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME \
  --public-ip-address $PUBLIC_IP_NAME \
  --os-disk-size-gb 64 \
  --storage-sku Premium_LRS
```

### 4. Query Public IP Address
```bash
az network public-ip show --resource-group $RESOURCE_GROUP --name $PUBLIC_IP_NAME --query "ipAddress" -o tsv
```

---

## 5. HOST OS & INFRASTRUCTURE INSTALLATION SCRIPTS

Connect to your Azure VM:
```bash
ssh azureuser@<YOUR_VM_PUBLIC_IP>
```

Execute the following automated installation steps on the Ubuntu VM:

### Step 5.1: System Update & Security Hardening
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw software-properties-common jq unzip

# Configure 4 GB Swap File (Essential for Next.js build compilation memory headroom)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Enable Host Firewall (Allow SSH, HTTP, HTTPS)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### Step 5.2: Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v   # Should output >= v20.18.0
npm -v    # Should output >= 10.8.0
```

### Step 5.3: Install & Configure PostgreSQL 16
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

sudo systemctl enable --now postgresql

# Create Database and Dedicated User
sudo -u postgres psql <<EOF
CREATE USER aura_user WITH PASSWORD 'YourStrongAuraDbPassword123!';
CREATE DATABASE aura_db OWNER aura_user;
GRANT ALL PRIVILEGES ON DATABASE aura_db TO aura_user;
ALTER DATABASE aura_db SET timezone TO 'UTC';
EOF
```

### Step 5.4: Install & Configure Redis 7 (Optional / Recommended)
```bash
sudo apt install -y redis-server
sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sudo sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf

# Add memory cap for small VM profile
sudo bash -c 'cat >> /etc/redis/redis.conf <<EOF
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF'

sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Verify Redis
redis-cli ping # Expected: PONG
```

### Step 5.5: Install Nginx & Certbot
```bash
sudo apt install -y nginx snapd
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo systemctl enable --now nginx
```

---

## 6. CODEBASE SETUP & PRODUCTION BUILD COMMANDS

### Step 6.1: Clone Repository
```bash
sudo mkdir -p /var/www/kai-aura
sudo chown -R $USER:$USER /var/www/kai-aura

# Clone your repository
git clone <YOUR_GIT_REPOSITORY_URL> /var/www/kai-aura
cd /var/www/kai-aura
```

### Step 6.2: Install & Build Backend Tier
```bash
cd /var/www/kai-aura/backend

# Install production and development dependencies for building
npm install

# Configure backend environment variables
cat << 'EOF' > .env
PORT="4000"
NODE_ENV="production"
DATABASE_URL="postgresql://aura_user:YourStrongAuraDbPassword123!@127.0.0.1:5432/aura_db?schema=public"
JWT_SECRET="replace_with_openssl_generated_64_char_hex_secret"
FRONTEND_URL="https://aura.yourcompany.com"
APP_URL="https://aura.yourcompany.com"

# External SMTP Relay Configuration (No on-box SMTP)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="YOUR_EXTERNAL_SENDGRID_OR_BREVO_API_KEY"
SMTP_FROM="\"KAI Aura\" <no-reply@yourcompany.com>"
SMTP_SECURE="false"

# Delivery Worker Configuration
DELIVERY_WORKER_ENABLED="true"
DELIVERY_WORKER_INTERVAL_MS="10000"
DELIVERY_WORKER_BATCH_SIZE="20"
DELIVERY_WORKER_MAX_RETRIES="3"

# Queue / Redis Mode (Set true if using Redis, false for DB polling fallback)
QUEUE_ENABLED="false"
REDIS_URL="redis://127.0.0.1:6379"
EOF

# Generate cryptographic JWT_SECRET
JWT_KEY=$(openssl rand -hex 64)
sed -i "s/replace_with_openssl_generated_64_char_hex_secret/$JWT_KEY/" .env

# Run Prisma migrations & compile Client
npx prisma generate
npx prisma migrate deploy

# Seed baseline roles, admin account, and default store rewards
npm run db:seed

# Compile TypeScript backend to dist/
npm run build
```

### Step 6.3: Install & Build Frontend Tier
```bash
cd /var/www/kai-aura/frontend

# Install dependencies
npm install

# Configure frontend environment variables
cat << EOF > .env.local
NODE_ENV="production"
# Server-side calls direct to localhost loopback
API_URL="http://127.0.0.1:4000/api"
# Client browser calls through Nginx SSL
NEXT_PUBLIC_API_URL="https://aura.yourcompany.com/api"
NEXT_PUBLIC_APP_URL="https://aura.yourcompany.com"
JWT_SECRET="$JWT_KEY"
EOF

# Compile Next.js production bundle with Turbopack
npm run build
```

---

## 7. PROCESS SUPERVISION (SYSTEMD DAEMONS)

Create three dedicated `systemd` service units to ensure automatic crash recovery, process restarts, and boot-up persistence:

### 1. Backend API Service (`kai-aura-backend.service`)
```bash
sudo bash -c 'cat << EOF > /etc/systemd/system/kai-aura-backend.service
[Unit]
Description=KAI Aura Express.js Backend API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=azureuser
WorkingDirectory=/var/www/kai-aura/backend
ExecStart=/usr/bin/node dist/src/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/var/www/kai-aura/backend/.env

# Security sandbox
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF'
```

### 2. Frontend Next.js Service (`kai-aura-frontend.service`)
```bash
sudo bash -c 'cat << EOF > /etc/systemd/system/kai-aura-frontend.service
[Unit]
Description=KAI Aura Next.js Frontend Application
After=network.target kai-aura-backend.service

[Service]
Type=simple
User=azureuser
WorkingDirectory=/var/www/kai-aura/frontend
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

# Security sandbox
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF'
```

### 3. Background Delivery Worker Service (`kai-aura-worker.service`)
```bash
sudo bash -c 'cat << EOF > /etc/systemd/system/kai-aura-worker.service
[Unit]
Description=KAI Aura Background Delivery Worker
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=azureuser
WorkingDirectory=/var/www/kai-aura/backend
ExecStart=/usr/bin/node dist/src/worker.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/kai-aura/backend/.env

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF'
```

### 4. Enable and Start All Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kai-aura-backend.service
sudo systemctl enable --now kai-aura-frontend.service
sudo systemctl enable --now kai-aura-worker.service

# Verify statuses
sudo systemctl status kai-aura-backend.service --no-pager
sudo systemctl status kai-aura-frontend.service --no-pager
sudo systemctl status kai-aura-worker.service --no-pager
```

---

## 8. NGINX REVERSE PROXY & TLS 1.3 CONFIGURATION

### Step 8.1: Create Nginx Virtual Host
```bash
sudo bash -c 'cat << "EOF" > /etc/nginx/sites-available/kai-aura.conf
server {
    listen 80;
    server_name aura.yourcompany.com <YOUR_VM_PUBLIC_IP>;

    client_max_body_size 25M;

    # Gzip compression for high-performance static delivery
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # 1. Backend REST API Routing
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 2. Next.js Static Asset Caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        access_log off;
    }

    # 3. Next.js App Router Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF'

# Enable site and test Nginx configuration
sudo ln -sf /etc/nginx/sites-available/kai-aura.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8.2: Provision TLS 1.3 Certificate (Let's Encrypt)
Once your corporate DNS `A` record (`aura.yourcompany.com`) points to your Azure VM Public IP:
```bash
sudo certbot --nginx -d aura.yourcompany.com --non-interactive --agree-tos -m admin@yourcompany.com --redirect
```

Certbot automatically configures HTTP-to-HTTPS 301 redirection and sets up a systemd cron renewal timer (`certbot.timer`).

---

## 9. SMOKE TESTING & VERIFICATION RUNBOOK

Execute these verification commands directly on the server to validate deployment health:

```bash
# 1. Verify Backend API Health
curl -s http://127.0.0.1:4000/api/health | jq .
# Expected: {"status":"ok","timestamp":"..."}

# 2. Verify Frontend Server Response
curl -I http://127.0.0.1:3000
# Expected: HTTP/1.1 200 OK

# 3. Verify Nginx Proxy via Public Interface
curl -k -I https://127.0.0.1/api/health
# Expected: HTTP/1.1 200 OK

# 4. Inspect System Logs for Errors
journalctl -u kai-aura-backend.service -n 50 --no-pager
journalctl -u kai-aura-frontend.service -n 50 --no-pager
journalctl -u kai-aura-worker.service -n 50 --no-pager
```

---

## 10. BACKUP & DISASTER RECOVERY COMMANDS

Configure an automated daily database backup to ensure business continuity:

```bash
sudo mkdir -p /var/backups/kai-aura
sudo chown postgres:postgres /var/backups/kai-aura

# Add daily cron job at 02:00 AM
sudo bash -c 'cat << "EOF" > /etc/cron.daily/kai-aura-db-backup
#!/bin/bash
BACKUP_DIR="/var/backups/kai-aura"
TIMESTAMP=$(date +\%Y\%m\%d_\%H\%M\%S)
sudo -u postgres pg_dump -Fc aura_db > "$BACKUP_DIR/aura_db_$TIMESTAMP.dump"
# Keep backups for 14 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +14 -delete
EOF'

sudo chmod +x /etc/cron.daily/kai-aura-db-backup
```

To restore from a backup:
```bash
sudo -u postgres pg_restore -d aura_db --clean /var/backups/kai-aura/aura_db_<TIMESTAMP>.dump
```

---

## 11. QUICK REFERENCE CHEAT SHEET

| Task | Command |
| :--- | :--- |
| **Restart Backend** | `sudo systemctl restart kai-aura-backend.service` |
| **Restart Frontend** | `sudo systemctl restart kai-aura-frontend.service` |
| **Restart Worker** | `sudo systemctl restart kai-aura-worker.service` |
| **View Live Backend Logs** | `journalctl -u kai-aura-backend.service -f` |
| **View Live Worker Logs** | `journalctl -u kai-aura-worker.service -f` |
| **Reload Nginx** | `sudo nginx -t && sudo systemctl reload nginx` |
| **Run Prisma Studio** | `cd /var/www/kai-aura/backend && npx prisma studio --port 5555` |
| **Check RAM Usage** | `free -h` |
| **Check Disk Footprint** | `df -h /` |
| **Check Port Bindings** | `sudo netstat -tulpn` |

================================================================================
END OF AZURE DEPLOYMENT SPECIFICATION
================================================================================

