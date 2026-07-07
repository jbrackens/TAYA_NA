#!/usr/bin/env bash
# cf-firewall.sh — restrict :80/:443 to Cloudflare IP ranges.
#
# Run once on the Hetzner box after switching DNS to proxied (orange-cloud).
# Prevents direct-to-origin requests that could forge CF-IPCountry.
#
# Docker publishes container ports via PREROUTING nat + FORWARD, NOT INPUT.
# Packets to published ports (80/443) never hit the INPUT chain, so we
# must filter in DOCKER-USER (the official hook Docker provides for
# user-defined rules in the FORWARD path). Docker inserts a RETURN at the
# end of DOCKER-USER by default; we jump to our CF-ALLOW chain before that
# RETURN. Non-Docker traffic (if any) is also covered via INPUT.
#
# DIRECTIONALITY (2026-07-07 incident): DOCKER-USER carries BOTH directions
# of forwarded container traffic. An unscoped "--dports 80,443 else DROP"
# also matches containers''' own OUTBOUND HTTP(S) — source is a container
# IP, never a CF range — which silently killed all container egress (the
# market catalog sync starved for weeks; host egress was fine so nothing
# obvious broke). The DOCKER-USER jump is therefore scoped to packets
# ENTERING via the public interface, and CF-ALLOW passes established
# flows first. INPUT keeps the unscoped jump (host-inbound only by
# definition).
#
# Re-run periodically or on a cron to pick up new CF ranges:
#   0 4 * * 0  /opt/phoenix/scripts/security/cf-firewall.sh 2>&1 | logger -t cf-fw
#
# Dry-run: CF_FIREWALL_DRY_RUN=1 ./cf-firewall.sh
set -euo pipefail

DRY_RUN="${CF_FIREWALL_DRY_RUN:-0}"

run_cmd() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

CF_IPV4=$(curl -fsS https://www.cloudflare.com/ips-v4)
CF_IPV6=$(curl -fsS https://www.cloudflare.com/ips-v6)

if [ -z "$CF_IPV4" ]; then
  echo "ERROR: failed to fetch Cloudflare IPv4 ranges" >&2
  exit 1
fi

# --- Flush old rules ---
echo "Flushing old CF-ALLOW chains..."
for table_cmd in iptables ip6tables; do
  for parent in INPUT DOCKER-USER; do
    $table_cmd -D "$parent" -j CF-ALLOW 2>/dev/null || true
  done
  if $table_cmd -L CF-ALLOW -n >/dev/null 2>&1; then
    run_cmd $table_cmd -F CF-ALLOW
    run_cmd $table_cmd -X CF-ALLOW
  fi
done

# --- IPv4: DOCKER-USER (published ports) + INPUT (non-Docker) ---
echo "Creating CF-ALLOW chain (IPv4)..."
run_cmd iptables -N CF-ALLOW
# Replies to outbound container connections must never be dropped.
run_cmd iptables -A CF-ALLOW -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
for cidr in $CF_IPV4; do
  run_cmd iptables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -s "$cidr" -j RETURN
done
run_cmd iptables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -j DROP

# DOCKER-USER: Docker-published ports flow through here
PUB_IF=$(ip route show default | awk '{print $5; exit}')
if [ -z "$PUB_IF" ]; then
  echo "ERROR: could not determine public interface" >&2
  exit 1
fi
if iptables -L DOCKER-USER -n >/dev/null 2>&1; then
  # Scoped to packets arriving on the public interface: inbound-to-published
  # ports is filtered; container OUTBOUND (arrives via the docker bridge)
  # never enters CF-ALLOW.
  run_cmd iptables -I DOCKER-USER -i "$PUB_IF" -j CF-ALLOW
  echo "  -> inserted into DOCKER-USER (in-iface $PUB_IF)"
fi
# INPUT: catch any non-Docker traffic to host ports
run_cmd iptables -I INPUT -j CF-ALLOW
echo "  -> inserted into INPUT"

# --- IPv6: same pattern (Docker on IPv6 is rare but cover it) ---
echo "Creating CF-ALLOW chain (IPv6)..."
if ip6tables -L DOCKER-USER -n >/dev/null 2>&1; then
  run_cmd ip6tables -N CF-ALLOW 2>/dev/null || { ip6tables -F CF-ALLOW; }
  run_cmd ip6tables -A CF-ALLOW -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
  for cidr in $CF_IPV6; do
    run_cmd ip6tables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -s "$cidr" -j RETURN
  done
  run_cmd ip6tables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -j DROP
  run_cmd ip6tables -I DOCKER-USER -i "$PUB_IF" -j CF-ALLOW
  run_cmd ip6tables -I INPUT -j CF-ALLOW
  echo "  -> inserted into DOCKER-USER (in-iface $PUB_IF) + INPUT (IPv6)"
else
  run_cmd ip6tables -N CF-ALLOW 2>/dev/null || { ip6tables -F CF-ALLOW; }
  run_cmd ip6tables -A CF-ALLOW -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
  for cidr in $CF_IPV6; do
    run_cmd ip6tables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -s "$cidr" -j RETURN
  done
  run_cmd ip6tables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -j DROP
  run_cmd ip6tables -I INPUT -j CF-ALLOW
  echo "  -> inserted into INPUT only (IPv6, no DOCKER-USER)"
fi

# --- Persist ---
echo "Persisting rules..."
if command -v netfilter-persistent >/dev/null 2>&1; then
  run_cmd netfilter-persistent save
else
  mkdir -p /etc/iptables
  run_cmd sh -c 'iptables-save > /etc/iptables/rules.v4'
  run_cmd sh -c 'ip6tables-save > /etc/iptables/rules.v6'
  echo "  (install iptables-persistent for auto-restore on reboot)"
fi

echo "Done. HTTP(S) traffic is now restricted to Cloudflare IPs."
echo "IPv4 ranges: $(echo "$CF_IPV4" | wc -l | tr -d ' ')"
echo "IPv6 ranges: $(echo "$CF_IPV6" | wc -l | tr -d ' ')"
