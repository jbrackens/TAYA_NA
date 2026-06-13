# Root convenience targets. The day-to-day dev Makefile lives at
# apps/Phoenix-Predict-Combined/Makefile (seed/demo/migrate helpers).
# The former `include scripts/Makefile` shim was archived in P2-01 — it
# hardcoded another machine's paths and sportsbook-era commands.

.PHONY: cashier-check
cashier-check:
	scripts/check-cashier-all.sh
