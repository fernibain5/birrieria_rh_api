#!/usr/bin/env bash
# Installs the Hikvision tunnel agent on a Raspberry Pi (run as root).
# Prerequisite: Tailscale already installed and joined to the tailnet
# (curl -fsSL https://tailscale.com/install.sh | sh && tailscale up).
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root: sudo ./install.sh"; exit 1; }
cd "$(dirname "$0")"

apt-get update
apt-get install -y socat arp-scan

install -d /etc/hikvision-tunnel
if [[ ! -f /etc/hikvision-tunnel/config ]]; then
  install -m 600 config.example /etc/hikvision-tunnel/config
  echo ">> EDIT /etc/hikvision-tunnel/config (set DEVICE_MAC!) then:"
  echo ">>   sudo systemctl restart hikvision-forward"
fi
install -m 755 hikvision-forward.sh /usr/local/bin/hikvision-forward.sh
install -m 644 hikvision-forward.service /etc/systemd/system/hikvision-forward.service
install -m 644 wifi-powersave-off.conf /etc/NetworkManager/conf.d/wifi-powersave-off.conf
systemctl reload NetworkManager 2>/dev/null || true

systemctl daemon-reload
systemctl enable --now hikvision-forward.service
systemctl --no-pager status hikvision-forward.service
