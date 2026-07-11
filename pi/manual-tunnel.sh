#!/usr/bin/env bash
# Temporary on-site tunnel: turns this laptop into a stand-in for the Pi so
# the VPS backend can reach the Hikvision device while the Pi is offline
# (e.g. after an internet-provider change at the restaurant).
#
# Run it from a computer connected to the restaurant's WiFi:
#   sudo ./manual-tunnel.sh [device-lan-ip]
#
# Without an argument it discovers the device by MAC via arp-scan. It then
# forwards TCP :$LISTEN_PORT -> device:$DEVICE_PORT with socat and prints the
# address to type in the web app (Incidencias → Sincronizar Manual).
set -u

DEVICE_MAC=${DEVICE_MAC:-2c:cc:7a:24:d5:4b} # San Pedro DS-K1T320MFWX-B (WiFi iface)
LISTEN_PORT=${LISTEN_PORT:-8571}
DEVICE_PORT=${DEVICE_PORT:-80}

die() { echo "ERROR: $*" >&2; exit 1; }

command -v socat >/dev/null || die "socat no está instalado (sudo apt install socat)"
command -v tailscale >/dev/null || die "tailscale no está instalado (https://tailscale.com/download)"

tailscale status >/dev/null 2>&1 \
  || die "Tailscale no está conectado. Ejecuta: sudo tailscale up"
TAILNET_IP=$(tailscale ip -4 2>/dev/null | head -1)
[[ -n "$TAILNET_IP" ]] || die "No se pudo obtener la IP de Tailscale de esta computadora"

DEVICE_IP=${1:-}
if [[ -z "$DEVICE_IP" ]]; then
  command -v arp-scan >/dev/null \
    || die "arp-scan no está instalado (sudo apt install arp-scan) — o pasa la IP del dispositivo como argumento"
  echo "Buscando el dispositivo Hikvision ($DEVICE_MAC) en la red local..."
  DEVICE_IP=$(arp-scan --localnet --quiet --ignoredups 2>/dev/null \
    | awk -v mac="$(echo "$DEVICE_MAC" | tr '[:upper:]' '[:lower:]')" 'tolower($2) == mac { print $1; exit }')
  [[ -n "$DEVICE_IP" ]] \
    || die "Dispositivo no encontrado. ¿Estás en el WiFi del restaurante? También puedes pasar la IP como argumento: sudo ./manual-tunnel.sh 192.168.1.131"
fi

echo
echo "════════════════════════════════════════════════════════════════"
echo "  Túnel activo: :$LISTEN_PORT → $DEVICE_IP:$DEVICE_PORT"
echo
echo "  En la página web (Incidencias → Sincronizar Manual) escribe:"
echo
echo "      $TAILNET_IP:$LISTEN_PORT"
echo
echo "  Deja esta ventana abierta mientras sincronizas."
echo "  Presiona Ctrl+C para detener el túnel."
echo "════════════════════════════════════════════════════════════════"
echo
exec socat TCP-LISTEN:"$LISTEN_PORT",fork,reuseaddr TCP:"$DEVICE_IP":"$DEVICE_PORT"
