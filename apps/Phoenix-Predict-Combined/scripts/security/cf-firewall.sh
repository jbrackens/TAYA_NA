#!/usr/bin/env bash
# cf-firewall.sh — restrict :80/:443 to Cloudflare IP ranges.
#
# Run once on the Hetzner box after switching DNS to proxied (orange-cloud).
# Prevents direct-to-origin requests that could forge CF-IPCountry.
#
# Uses iptables (nftables variant: adapt if needed). The box must already
# have iptables installed (Hetzner base images do). SSH (:22) is left open
# so you don't lock yourself out.
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

echo "Flushing old CF-ALLOW chains..."
for chain in CF-ALLOW CF-ALLOW6; do
  if iptables -L "$chain" -n >/dev/null 2>&1; then
    run_cmd iptables -D INPUT -j "$chain" 2>/dev/null || true
    run_cmd iptables -F "$chain"
    run_cmd iptables -X "$chain"
  fi
  if ip6tables -L "$chain" -n >/dev/null 2>&1; then
    run_cmd ip6tables -D INPUT -j "$chain" 2>/dev/null || true
    run_cmd ip6tables -F "$chain"
    run_cmd ip6tables -X "$chain"
  fi
done

echo "Creating CF-ALLOW chain (IPv4)..."
run_cmd iptables -N CF-ALLOW
for cidr in $CF_IPV4; do
  run_cmd iptables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -s "$cidr" -j ACCEPT
done
run_cmd iptables -A CF-ALLOW -p tcp -m multiport --dports 80,443 -j DROP
run_cmd iptables -I INPUT -j CF-ALLOW

echo "Creating CF-ALLOW6 chain (IPv6)..."
run_cmd ip6tables -N CF-ALLOW6
for cidr in $CF_IPV6; do
  run_cmd ip6tables -A CF-ALLOW6 -p tcp -m multiport --dports 80,443 -s "$cidr" -j ACCEPT
done
run_cmd ip6tables -A CF-ALLOW6 -p tcp -m multiport --dports 80,443 -j DROP
run_cmd ip6tables -I INPUT -j CF-ALLOW6

echo "Persisting rules..."
if command -v netfilter-persistent >/dev/null 2>&1; then
  run_cmd netfilter-persistent save
elif command -v iptables-save >/dev/null 2>&1; then
  run_cmd sh -c 'iptables-save > /etc/iptables/rules.v4'
  run_cmd sh -c 'ip6tables-save > /etc/iptables/rules.v6'
fi

echo "Done. HTTP(S) traffic is now restricted to Cloudflare IPs."
echo "IPv4 ranges: $(echo "$CF_IPV4" | wc -l | tr -d ' ')"
echo "IPv6 ranges: $(echo "$CF_IPV6" | wc -l | tr -d ' ')"
