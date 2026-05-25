# Compatibility entrypoint for older workspace tooling.
include scripts/Makefile

.PHONY: cashier-check
cashier-check:
	scripts/check-cashier-all.sh
