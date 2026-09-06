# Root convenience targets.
#
# Day-to-day dev targets (seed, demo-data, wipe-demo, migrate-*) live in the
# gateway Makefile:
#   apps/taptrade-platform/go-platform/services/gateway/Makefile
#
# The old apps/taptrade-platform/Makefile was removed in the 2026-09 cleanup
# along with the Phoenix-revival trees its 66 targets drove (JVM baselines,
# preservation gates, sportsbook smoke).

.PHONY: cashier-check
cashier-check: ## Validate the dormant real-money trees still build and stay unmounted
	scripts/check-cashier-all.sh
