# Raspberry Pi — Hikvision tunnel agent

A Raspberry Pi in the restaurant joins the Tailscale tailnet, finds the
Hikvision device on the LAN by MAC address (DHCP-proof), and forwards a TCP
port to it. The VPS backend then reaches the device at
`http://<pi-tailnet-ip>:8571`, so the existing ISAPI sync **and** employee
provisioning work unchanged from anywhere.

```
VPS (api.birrierialapurisima.com.mx)              Restaurant LAN
┌────────────────────────────────┐               ┌─────────────────────────────┐
│ tailscaled (host)              │   Tailscale   │ Pi 3A+ (tailscaled)         │
│ app container ─────────────────┼── 100.x.y.z ─►│ socat :8571 ──► device:80   │
│  http://100.x.y.z:8571/ISAPI/…│               │  ▲ arp-scan by MAC (60s)    │
└────────────────────────────────┘               └─────────────────────────────┘
```

## Files

| File | Installed to | Purpose |
|---|---|---|
| `config.example` | `/etc/hikvision-tunnel/config` | Per-restaurant values (device MAC, ports) |
| `hikvision-forward.sh` | `/usr/local/bin/` | Discovery loop + socat forward |
| `hikvision-forward.service` | `/etc/systemd/system/` | Runs the script on boot, restarts on failure |
| `wifi-powersave-off.conf` | `/etc/NetworkManager/conf.d/` | Keeps WiFi (and the tunnel) alive when idle |
| `install.sh` | — | Installs all of the above |

## 1. Flash the Pi

Use Raspberry Pi Imager with **Raspberry Pi OS Lite (32-bit)** (best RAM
headroom on the 512MB 3A+). In the OS customization screen set:

- Hostname: `pi-sanpedro` (or `pi-lasquintas` for a second Pi)
- Enable SSH, create user (e.g. `admin`)
- Restaurant WiFi SSID/password + WiFi country

## 2. First boot

```bash
ssh admin@pi-sanpedro.local
sudo apt update && sudo apt full-upgrade -y
```

## 3. Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up          # authenticate in the browser link it prints
tailscale ip -4            # note this IP, e.g. 100.64.1.5
```

In the Tailscale admin console (login.tailscale.com): **disable key expiry**
for this node (⋯ → Disable key expiry) — otherwise the tunnel silently dies
after ~180 days.

## 4. Install the agent

From this repo on your machine:

```bash
scp -r pi admin@pi-sanpedro.local:~/pi
ssh admin@pi-sanpedro.local
cd ~/pi && sudo ./install.sh
sudo nano /etc/hikvision-tunnel/config    # set DEVICE_MAC
sudo systemctl restart hikvision-forward
```

Find the device MAC in the router's DHCP client list, or:
`sudo arp-scan --interface=wlan0 --localnet` (Hikvision OUIs often start with
`a4:d5:c2`, `bc:ad:28`, `c0:56:e3`).

Verify on the Pi:

```bash
journalctl -u hikvision-forward -f
# expect: "Device <mac> found at <ip>" then "socat pid …"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8571/ISAPI/System/deviceInfo
# expect: 401  (Digest challenge — the forward reaches the device)
```

## 5. VPS side

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up               # disable key expiry for this node too
curl -s -o /dev/null -w '%{http_code}\n' http://<pi-tailnet-ip>:8571/ISAPI/System/deviceInfo
# expect: 401

# The app container must also reach it (node:20-alpine has no curl):
docker exec birrieria_rh_api-app-1 node -e \
  "fetch('http://<pi-tailnet-ip>:8571/ISAPI/System/deviceInfo').then(r=>console.log(r.status)).catch(e=>{console.error(e.message);process.exit(1)})"
# expect: 401
```

If the container test fails: check `iptables -t nat -L POSTROUTING -n -v | grep -i masq`
(Docker's MASQUERADE should cover traffic leaving via tailscale0); if missing,
add `iptables -t nat -A POSTROUTING -s <compose-subnet> -o tailscale0 -j MASQUERADE`.

## 6. Point the backend at the tunnel

```bash
cd ~/birrieria_rh_api
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U admin -d attendance_db \
  -c "UPDATE \"Restaurant\" SET \"hikvisionIp\" = '<pi-tailnet-ip>:8571' WHERE id = <restaurant-id>;"
```

Use the raw tailnet IP (stable for the node's lifetime), not the MagicDNS
name — the container doesn't use the host's Tailscale resolver.

Auto-sync runs every 10 minutes when `SYNC_CRON_ENABLED=true` is set in the
VPS `.env` (see `docker-compose.prod.yml`); the manual "Sincronizar" button
keeps working as a force-refresh.

## Adding a second restaurant

Repeat with a new Pi: different hostname, that restaurant's WiFi, its device's
`DEVICE_MAC` in the config (`LISTEN_PORT` can stay 8571 — each Pi has its own
tailnet IP), then update that restaurant's `hikvisionIp` row.

## Troubleshooting

- `journalctl -u hikvision-forward -f` — discovery/forward log on the Pi.
- `tailscale status` on either end — node connectivity.
- Device IP changed? The loop rediscovers it within `CHECK_INTERVAL` (60s).
  A DHCP reservation for the device MAC in the router makes this a non-event.
- Pi offline for a while? No data is lost: the sync window starts at the last
  successful `SyncLog` and the device retains events, so the next successful
  sync backfills the gap.
