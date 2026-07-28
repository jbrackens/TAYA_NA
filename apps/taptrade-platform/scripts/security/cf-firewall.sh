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
# also matches containers' own OUTBOUND HTTP(S) — source is a container
# IP, never a CF range — which silently killed all container egress (the
# market catalog sync starved for weeks; host egress was fine so nothing
# obvious broke). The DOCKER-USER jump is therefore scoped to packets
# ENTERING via the public interface, and CF-ALLOW passes established
# flows first. INPUT keeps the unscoped jump (host-inbound only by
# definition).
#
# FAIL-OPEN INCIDENT (2026-07-28): the teardown deleted references with a
# bare `-D <parent> -j CF-ALLOW`, but the DOCKER-USER reference carries
# the `-i <iface>` match added for the directionality fix above. iptables
# `-D` requires an EXACT rule-spec match, so that delete silently failed,
# `-X CF-ALLOW` then failed ("Device or resource busy"), and `set -e`
# aborted the script — AFTER `-F` had already emptied the chain. Every
# deploy therefore left an empty-but-referenced CF-ALLOW: zero filtering,
# origin reachable directly, announced only as a yellow warning. Two
# structural fixes below:
#   1. references are torn down by rewriting `iptables -S` output, so any
#      match spec (and any number of duplicates) is removed;
#   2. the new chain is built and referenced BEFORE the old one is
#      dropped, then renamed into place — so there is no window in which
#      a referenced chain is empty, and an abort can never fail open.
# The script also VERIFIES the result and exits non-zero if the filter
# is not actually in force.
#
# Re-run periodically or on a cron to pick up new CF ranges:
#   0 4 * * 0  /opt/phoenix/scripts/security/cf-firewall.sh 2>&1 | logger -t cf-fw
#
# Dry-run: CF_FIREWALL_DRY_RUN=1 ./cf-firewall.sh
set -euo pipefail

DRY_RUN="${CF_FIREWALL_DRY_RUN:-0}"
CHAIN="CF-ALLOW"
STAGING="CF-ALLOW-NEW"

run_cmd() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

# Delete EVERY reference to $2 from chain $1, whatever match spec it
# carries (-i eth0, etc.) and however many duplicates exist. Rewrites the
# rule as printed by `-S` so the delete is always an exact match.
delete_refs() {
  local table_cmd="$1" parent="$2" target="$3" guard=0
  if [ "$DRY_RUN" = "1" ]; then
    # Nothing is actually removed in a dry run, so re-listing would loop
    # forever: enumerate the current references once instead.
    local line
    while IFS= read -r line; do
      [ -n "$line" ] && echo "[dry-run] $table_cmd ${line/#-A/-D}"
    done < <($table_cmd -S "$parent" 2>/dev/null | grep -- "-j ${target}\$" || true)
    return 0
  fi
  while :; do
    local rule
    rule=$($table_cmd -S "$parent" 2>/dev/null | grep -m1 -- "-j ${target}\$" || true)
    [ -z "$rule" ] && break
    guard=$((guard + 1))
    if [ "$guard" -gt 20 ]; then
      echo "ERROR: >20 references to $target in $parent; refusing to loop" >&2
      exit 1
    fi
    # shellcheck disable=SC2086 # deliberate word-splitting of the rule spec
    run_cmd $table_cmd ${rule/#-A/-D}
  done
}

# Build the staging chain, point traffic at it, then retire the old one
# and rename. Never leaves a referenced chain empty.
build_chain() {
  local table_cmd="$1" pub_if="$2"
  shift 2
  local cidrs=("$@")

  # (Creation goes through run_cmd too — an un-guarded -N would mutate
  # the ruleset during a dry run.)
  if $table_cmd -L "$STAGING" -n >/dev/null 2>&1; then
    run_cmd $table_cmd -F "$STAGING"
  else
    run_cmd $table_cmd -N "$STAGING"
  fi
  # Replies to outbound container connections must never be dropped.
  run_cmd $table_cmd -A "$STAGING" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
  local cidr
  for cidr in "${cidrs[@]}"; do
    run_cmd $table_cmd -A "$STAGING" -p tcp -m multiport --dports 80,443 -s "$cidr" -j RETURN
  done
  run_cmd $table_cmd -A "$STAGING" -p tcp -m multiport --dports 80,443 -j DROP

  # Reference the populated staging chain first — filtering is continuous.
  if $table_cmd -L DOCKER-USER -n >/dev/null 2>&1; then
    run_cmd $table_cmd -I DOCKER-USER -i "$pub_if" -j "$STAGING"
    echo "  -> referenced from DOCKER-USER (in-iface $pub_if)"
  fi
  run_cmd $table_cmd -I INPUT -j "$STAGING"
  echo "  -> referenced from INPUT"

  # Retire the previous chain (all of its references, then the chain).
  delete_refs "$table_cmd" INPUT "$CHAIN"
  delete_refs "$table_cmd" DOCKER-USER "$CHAIN"
  if $table_cmd -L "$CHAIN" -n >/dev/null 2>&1; then
    run_cmd $table_cmd -F "$CHAIN"
    run_cmd $table_cmd -X "$CHAIN"
  fi
  # Rename into place; references follow the chain.
  run_cmd $table_cmd -E "$STAGING" "$CHAIN"
}

# Fail loudly if the filter is not actually in force — an empty or
# unreferenced chain is a silently open origin, which is what the
# 2026-07-28 incident shipped for weeks.
verify_chain() {
  local table_cmd="$1" label="$2"
  [ "$DRY_RUN" = "1" ] && return 0
  local drops refs
  drops=$($table_cmd -S "$CHAIN" 2>/dev/null | grep -c -- "-j DROP" || true)
  refs=$($table_cmd -S 2>/dev/null | grep -c -- "-j ${CHAIN}\$" || true)
  if [ "${drops:-0}" -lt 1 ] || [ "${refs:-0}" -lt 1 ]; then
    echo "ERROR: $label filter not in force (DROP rules=$drops, references=$refs)" >&2
    return 1
  fi
  echo "  verified $label: $refs reference(s), $drops DROP rule(s)"
  return 0
}

CF_IPV4=$(curl -fsS https://www.cloudflare.com/ips-v4)
CF_IPV6=$(curl -fsS https://www.cloudflare.com/ips-v6)

if [ -z "$CF_IPV4" ]; then
  echo "ERROR: failed to fetch Cloudflare IPv4 ranges" >&2
  exit 1
fi

PUB_IF=$(ip route show default | awk '{print $5; exit}')
if [ -z "$PUB_IF" ]; then
  echo "ERROR: could not determine public interface" >&2
  exit 1
fi

# --- IPv4: DOCKER-USER (published ports) + INPUT (non-Docker) ---
echo "Rebuilding $CHAIN (IPv4)..."
# shellcheck disable=SC2086 # CF_IPV4 is a newline-separated CIDR list
build_chain iptables "$PUB_IF" $CF_IPV4

# --- IPv6: same pattern (Docker on IPv6 is rare but cover it) ---
echo "Rebuilding $CHAIN (IPv6)..."
# shellcheck disable=SC2086
build_chain ip6tables "$PUB_IF" $CF_IPV6

# --- Verify BEFORE persisting: never save a broken ruleset ---
echo "Verifying..."
verify_chain iptables IPv4
verify_chain ip6tables IPv6

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
