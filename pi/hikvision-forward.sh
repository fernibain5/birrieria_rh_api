#!/usr/bin/env bash
# Discovers the Hikvision device on the LAN by MAC address and forwards
# TCP :$LISTEN_PORT -> device:$DEVICE_PORT via socat, so the VPS backend can
# reach the device through this Pi's Tailscale IP. Re-scans every
# CHECK_INTERVAL seconds and restarts the forward only if the DHCP IP changed
# or socat died — a transient arp-scan miss keeps the last-known forward alive.
set -u
CONFIG=/etc/hikvision-tunnel/config
# shellcheck source=/dev/null
source "$CONFIG"

DEVICE_MAC=$(echo "$DEVICE_MAC" | tr '[:upper:]' '[:lower:]')
CURRENT_IP=""
SOCAT_PID=""

log() { echo "$(date '+%F %T') $*"; }

discover_ip() {
  arp-scan --interface="$LAN_IFACE" --localnet --quiet --ignoredups 2>/dev/null \
    | awk -v mac="$DEVICE_MAC" 'tolower($2) == mac { print $1; exit }'
}

start_socat() {
  socat TCP-LISTEN:"$LISTEN_PORT",fork,reuseaddr TCP:"$CURRENT_IP":"$DEVICE_PORT" &
  SOCAT_PID=$!
  log "socat pid $SOCAT_PID: :$LISTEN_PORT -> $CURRENT_IP:$DEVICE_PORT"
}

stop_socat() {
  if [[ -n "$SOCAT_PID" ]] && kill -0 "$SOCAT_PID" 2>/dev/null; then
    kill "$SOCAT_PID" 2>/dev/null
    wait "$SOCAT_PID" 2>/dev/null
  fi
  SOCAT_PID=""
}

trap 'stop_socat; exit 0' SIGTERM SIGINT

while true; do
  IP=$(discover_ip)
  if [[ -n "$IP" && "$IP" != "$CURRENT_IP" ]]; then
    log "Device $DEVICE_MAC found at $IP (previous: ${CURRENT_IP:-none})"
    stop_socat
    CURRENT_IP="$IP"
    start_socat
  elif [[ -z "$IP" && -z "$CURRENT_IP" ]]; then
    log "Device $DEVICE_MAC not found on $LAN_IFACE yet — retrying"
  fi
  if [[ -n "$CURRENT_IP" ]] && ! kill -0 "$SOCAT_PID" 2>/dev/null; then
    log "socat not running — restarting"
    start_socat
  fi
  sleep "$CHECK_INTERVAL"
done
