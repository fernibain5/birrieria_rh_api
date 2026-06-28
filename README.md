# Birrieria RH — Attendance API

NestJS REST API connecting Hikvision fingerprint attendance devices to a PostgreSQL database.  
Phase 1: all endpoints are public. Auth is added in Phase 2.

---

## Quick Start (Local Development)

```bash
# 1. Copy env file
cp .env.example .env

# 2. Start PostgreSQL
docker compose up -d

# 3. Install dependencies
npm install

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Start dev server (hot reload)
npm run start:dev
```

The API will be available at `http://localhost:3001`.

---

## API Reference

All routes are public. No authentication required in Phase 1.

### Restaurants
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/restaurants` | List all restaurants |
| `POST` | `/restaurants` | Create a restaurant |

**POST /restaurants body:**
```json
{
  "name": "Birrieria RH - Sucursal Norte",
  "hikvisionIp": "10.0.0.2",
  "hikvisionUser": "admin",
  "hikvisionPass": "your_device_password"
}
```
> ⚠️ `hikvisionPass` is **never** returned in API responses.

### Employees
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/restaurants/:id/employees` | List active employees |
| `POST` | `/restaurants/:id/employees` | Create employee |
| `PATCH` | `/restaurants/:id/employees/:eid` | Update employee |
| `DELETE` | `/restaurants/:id/employees/:eid` | Soft delete |

**POST /restaurants/:id/employees body:**
```json
{
  "hikvisionId": "1234",
  "name": "Juan García",
  "department": "Cocina",
  "email": "juan@example.com"
}
```

### Attendance
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/restaurants/:id/attendance` | List records (paginated) |
| `GET` | `/restaurants/:id/attendance/sync` | Trigger Hikvision sync |
| `GET` | `/restaurants/:id/attendance/download` | Download CSV |

**Query params for list and download:**  
`startDate` (ISO), `endDate` (ISO), `employeeId`, `page` (default 1), `limit` (default 50, max 200)

---

## VPS Deployment

### Prerequisites
- VPS with Docker + Docker Compose installed
- Domain or public IP for the VPS
- WireGuard configured (see below) so the VPS can reach each restaurant's Hikvision device

### Deploy Steps

```bash
# On the VPS — clone the repo and configure
git clone <your-repo> /opt/birrieria-rh-api
cd /opt/birrieria-rh-api

# Create a .env with production values
cat > .env <<EOF
POSTGRES_USER=admin
POSTGRES_PASSWORD=<strong_password>
POSTGRES_DB=attendance_db
CORS_ORIGIN=https://your-frontend-domain.com
PORT=3001
EOF

# Build and start
docker compose -f docker-compose.prod.yml up -d --build
```

The app auto-runs `prisma migrate deploy` on startup.

---

## WireGuard VPN Setup (VPS → Restaurant Hikvision Devices)

The Hikvision devices are on local restaurant LANs (e.g. `192.168.1.XX`). Since the API runs on a VPS, a WireGuard VPN tunnel is used so the VPS can reach those local IPs.

### Architecture
```
VPS (10.0.0.1) ─── WireGuard tunnel ──► Restaurant Router (10.0.0.2)
                                               │
                                               └── Hikvision device (192.168.1.100)
```

### 1. VPS — Install & Configure WireGuard Server

```bash
# Ubuntu/Debian
sudo apt install wireguard

# Generate keys
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
chmod 600 /etc/wireguard/server_private.key

# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server_private_key>
Address = 10.0.0.1/24
ListenPort = 51820

# Restaurant 1
[Peer]
PublicKey = <restaurant1_public_key>
AllowedIPs = 10.0.0.2/32, 192.168.1.0/24   # Allow VPS to route into restaurant LAN

# Restaurant 2
[Peer]
PublicKey = <restaurant2_public_key>
AllowedIPs = 10.0.0.3/32, 192.168.2.0/24
```

```bash
# Enable and start
sudo systemctl enable --now wg-quick@wg0

# Open firewall port
sudo ufw allow 51820/udp
```

### 2. Router at Each Restaurant — Configure WireGuard Client

Most modern routers (OpenWrt, MikroTik, Ubiquiti) support WireGuard. Alternatively, run a WireGuard client on a local PC that stays on.

**Option A — OpenWrt router:**
```
Network → VPN → WireGuard
Private Key: <restaurant_private_key>
Peers → Add:
  Public Key: <vps_public_key>
  Endpoint: <vps_ip>:51820
  Allowed IPs: 10.0.0.1/32
  Route Allowed IPs: checked
```

**Option B — local PC (Raspberry Pi or any Linux machine):**
```ini
# /etc/wireguard/wg0.conf on the local PC
[Interface]
PrivateKey = <restaurant_private_key>
Address = 10.0.0.2/24

[Peer]
PublicKey = <vps_public_key>
Endpoint = <vps_ip>:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

```bash
sudo systemctl enable --now wg-quick@wg0
```

### 3. IP Routing — Forward VPN Traffic to Hikvision

On the restaurant router (or local PC acting as gateway), enable IP forwarding:

```bash
# Enable IP forwarding (add to /etc/sysctl.conf)
net.ipv4.ip_forward=1

# NAT rule so VPN traffic reaches 192.168.1.0/24
iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
```

### 4. Register Each Restaurant in the API

Once WireGuard is running, use the **WireGuard tunnel IP** (not the LAN IP) as `hikvisionIp`:

```bash
# Restaurant 1 — Hikvision is reachable at 10.0.0.2 → 192.168.1.100
# Use the WireGuard peer IP if your router NATs it, or the LAN IP if routing is set up
curl -X POST http://your-vps:3001/restaurants \
  -H "Content-Type: application/json" \
  -d '{"name":"Sucursal Norte","hikvisionIp":"192.168.1.100","hikvisionUser":"admin","hikvisionPass":"your_pass"}'
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://admin:pass@localhost:5432/attendance_db` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://rh.birrieria.com` |
| `PORT` | Server port | `3001` |

> Hikvision credentials are stored **per restaurant** in the database — not in env vars.

---

## Development Commands

```bash
npm run start:dev            # Dev server with hot reload
npm run build                # Compile TypeScript
npm run start:prod           # Run compiled build
npm run test                 # Run unit tests
npm run lint                 # ESLint

npx prisma migrate dev --name <name>   # Create + apply a migration
npx prisma migrate deploy              # Apply migrations (production)
npx prisma generate                    # Regenerate Prisma client
npx prisma studio                      # Open Prisma GUI
```
