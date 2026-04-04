SHELL := /bin/bash

# Resolve repo root from this Makefile location so targets work on any machine/CI clone path.
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
STACK_SCRIPT := $(ROOT)/scripts/local-stack.sh
JAVA_PROFILE_SCRIPT := $(ROOT)/scripts/runtime/java-profile.sh
SBOM_SCRIPT := $(ROOT)/scripts/security/generate-sbom.sh
MIGRATION_SCRIPT := $(ROOT)/scripts/data/validate-db-migrations.sh
SEED_SCRIPT := $(ROOT)/scripts/data/prepare-deterministic-seeds.sh
PLATFORM_HEALTH_SCRIPT := $(ROOT)/scripts/platform/health-check.sh
PLATFORM_METRICS_SCRIPT := $(ROOT)/scripts/platform/metrics-smoke.sh
E2E_SCRIPT := $(ROOT)/scripts/qa/go-critical-path-e2e.sh
PERF_SCRIPT := $(ROOT)/scripts/qa/go-load-baseline.sh
CAPABILITY_SLO_SCRIPT := $(ROOT)/scripts/qa/go-capability-slo-gate.sh
CONFORMANCE_SCRIPT := $(ROOT)/scripts/qa/go-provider-conformance.sh
REGRESSION_PACK_SCRIPT := $(ROOT)/scripts/qa/go-regression-pack.sh
CHAOS_SUITE_SCRIPT := $(ROOT)/scripts/qa/go-provider-chaos-suite.sh
SPORTS_ROUTE_SMOKE_SCRIPT := $(ROOT)/scripts/qa/sports-route-smoke.sh
SPORTS_REGRESSION_GATE_SCRIPT := $(ROOT)/scripts/qa/sports-regression-gate.sh
CUTOVER_SCRIPT := $(ROOT)/scripts/release/cutover-rehearsal.sh
LAUNCH_GATE_SCRIPT := $(ROOT)/scripts/release/launch-readiness-gate.sh
RUNTIME_GATE_PROFILE_SCRIPT := $(ROOT)/scripts/release/runtime-gate-profile.sh
STABILITY_BURNIN_SCRIPT := $(ROOT)/scripts/release/stabilization-burnin.sh
PRIVATE_GOVERNANCE_SCRIPT := $(ROOT)/scripts/release/private-governance-enforce.sh
PRIVATE_HOOKS_INSTALL_SCRIPT := $(ROOT)/scripts/release/install-private-governance-hooks.sh
HISTORICAL_BETS_CSV ?= $(ROOT)/phoenix-backend/services/src/test/resources/data/reports/application/multiple-states-bets.csv
HISTORICAL_BETS_DIR ?= $(ROOT)/phoenix-backend/services/src/test/resources/data/reports/application

.PHONY: help bootstrap start stop restart status logs java-profile verify verify-backend verify-talon verify-sportsbook verify-go verify-api-contract-fixtures frontend-deps-baseline security-secrets security-deps security-jvm security-sbom security-baseline validate-migrations seed-deterministic platform-health platform-metrics qa-e2e-critical qa-load-baseline qa-capability-slo qa-provider-conformance qa-regression-pack qa-provider-chaos qa-sports-route-smoke qa-sports-regression release-cutover-rehearsal release-launch-readiness release-launch-readiness-runtime release-launch-readiness-runtime-profile release-governance-private release-install-private-governance-hooks release-stability-burnin go-test go-run-gateway go-run-auth go-reconciliation-report go-reconciliation-report-historical go-reconciliation-report-historical-strict go-reconciliation-report-historical-dir

help:
	@echo "Available targets:"
	@echo "  make bootstrap         # install deps + local env files"
	@echo "  make start             # start backend + go-gateway + Talon + Sportsbook"
	@echo "  make stop              # stop started services"
	@echo "  make restart           # restart all services"
	@echo "  make status            # show service and HTTP health status"
	@echo "  make logs              # tail logs for all services"
	@echo "  make java-profile      # print/export Java 21 transitional profile (fallback to Java 17)"
	@echo "  make verify            # run the full quality gate"
	@echo "  make verify-backend    # backend compile + test compile"
	@echo "  make verify-talon      # Talon bootstrap + office build"
	@echo "  make verify-sportsbook # Sportsbook bootstrap + app build"
	@echo "  make verify-go         # SB-501/502/503 gates + strict historical reconciliation parity"
	@echo "  make verify-api-contract-fixtures # Sportsbook API response-shape fixture regression gate"
	@echo "  make frontend-deps-baseline # capture Talon/Sportsbook outdated dependency baseline report"
	@echo "  make security-secrets  # run secret scan baseline report"
	@echo "  make security-deps     # run dependency vulnerability baseline report"
	@echo "  make security-jvm      # run JVM/SBT dependency baseline report"
	@echo "  make security-sbom     # generate SBOM artifacts across major components"
	@echo "  make security-baseline # run all security baseline reports"
	@echo "  make validate-migrations # validate Flyway migrations from clean Postgres state"
	@echo "  make seed-deterministic  # materialize deterministic local seed files/env"
	@echo "  make platform-health   # run health/readiness/liveness smoke checks"
	@echo "  make platform-metrics  # run metrics endpoint smoke checks"
	@echo "  make qa-e2e-critical   # run Go critical-path end-to-end smoke suite"
	@echo "  make qa-load-baseline  # run API load/perf baseline harness"
	@echo "  make qa-capability-slo # run strict capability SLO gate (placement/cashout/realtime)"
	@echo "  make qa-provider-conformance # run SB-501 provider conformance suite"
	@echo "  make qa-regression-pack # run SB-502 canonical regression test pack"
	@echo "  make qa-provider-chaos # run SB-503 provider chaos suite + thresholds"
	@echo "  make qa-sports-route-smoke # smoke-check native /sports/<sport> routes + canonical feed adapters"
	@echo "  make qa-sports-regression # cross-sport runtime gate (smoke + load loop + esports compatibility)"
	@echo "  make release-cutover-rehearsal # run cutover/rollback rehearsal checklist"
	@echo "  make release-launch-readiness # run phase-9 launch readiness gate checklist"
	@echo "  make release-launch-readiness-runtime # launch readiness + optional multi-sport runtime regression gate"
	@echo "  make release-launch-readiness-runtime-profile # managed runtime profile (start stack, wait, run runtime gate, teardown)"
	@echo "  make release-governance-private # private-repo governance fallback gate bundle"
	@echo "  make release-install-private-governance-hooks # install release-ref pre-push governance hook"
	@echo "  make release-stability-burnin # run phase-10 post-launch stabilization burn-in"
	@echo "  make go-test           # run tests across go-platform workspace"
	@echo "  make go-run-gateway    # run Go gateway service"
	@echo "  make go-run-auth       # run Go auth service"
	@echo "  make go-reconciliation-report # run lifecycle reconciliation parity report"
	@echo "  make go-reconciliation-report-historical # run lifecycle + historical CSV parity report"
	@echo "  make go-reconciliation-report-historical-strict # fail if any historical rows are skipped"
	@echo "  make go-reconciliation-report-historical-dir # strict parity across all CSVs in HISTORICAL_BETS_DIR"

bootstrap:
	@bash $(STACK_SCRIPT) bootstrap

start:
	@bash $(STACK_SCRIPT) start

stop:
	@bash $(STACK_SCRIPT) stop

restart:
	@bash $(STACK_SCRIPT) restart

status:
	@bash $(STACK_SCRIPT) status

logs:
	@bash $(STACK_SCRIPT) logs

java-profile:
	@bash "$(JAVA_PROFILE_SCRIPT)" --print-env --write-env-file

verify: verify-backend verify-talon verify-sportsbook verify-go

verify-backend:
	@cd "$(ROOT)/phoenix-backend" && \
		export JAVA_HOME="$${JAVA_HOME:-$$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17)}" && \
		sbt "phoenix-backend/compile" "phoenix-backend/test:compile"

verify-talon:
	@bash "$(ROOT)/scripts/frontend/verify-talon.sh"

verify-sportsbook:
	@bash "$(ROOT)/scripts/frontend/verify-sportsbook.sh"

verify-go:
	@$(MAKE) qa-provider-conformance
	@$(MAKE) qa-regression-pack
	@$(MAKE) qa-provider-chaos
	@$(MAKE) go-reconciliation-report-historical-strict

verify-api-contract-fixtures:
	@bash "$(ROOT)/scripts/frontend/verify-api-contract-fixtures.sh"

frontend-deps-baseline:
	@bash "$(ROOT)/scripts/frontend/dependency-modernization-baseline.sh"

security-secrets:
	@bash "$(ROOT)/scripts/security/scan-secrets.sh"

security-deps:
	@bash "$(ROOT)/scripts/security/dependency-baseline.sh"

security-jvm:
	@bash "$(ROOT)/scripts/security/jvm-dependency-baseline.sh"

security-sbom:
	@bash "$(SBOM_SCRIPT)"

security-baseline: security-secrets security-deps security-jvm security-sbom

validate-migrations:
	@bash "$(MIGRATION_SCRIPT)"

seed-deterministic:
	@bash "$(SEED_SCRIPT)"

platform-health:
	@bash "$(PLATFORM_HEALTH_SCRIPT)"

platform-metrics:
	@bash "$(PLATFORM_METRICS_SCRIPT)"

qa-e2e-critical:
	@bash "$(E2E_SCRIPT)"

qa-load-baseline:
	@bash "$(PERF_SCRIPT)"

qa-capability-slo:
	@bash "$(CAPABILITY_SLO_SCRIPT)"

qa-provider-conformance:
	@bash "$(CONFORMANCE_SCRIPT)"

qa-regression-pack:
	@bash "$(REGRESSION_PACK_SCRIPT)"

qa-provider-chaos:
	@bash "$(CHAOS_SUITE_SCRIPT)"

qa-sports-route-smoke:
	@bash "$(SPORTS_ROUTE_SMOKE_SCRIPT)"

qa-sports-regression:
	@bash "$(SPORTS_REGRESSION_GATE_SCRIPT)"

release-cutover-rehearsal:
	@bash "$(CUTOVER_SCRIPT)"

release-launch-readiness:
	@bash "$(LAUNCH_GATE_SCRIPT)"

release-launch-readiness-runtime:
	@RUN_MULTI_SPORT_RUNTIME_GATE=1 bash "$(LAUNCH_GATE_SCRIPT)"

release-launch-readiness-runtime-profile:
	@bash "$(RUNTIME_GATE_PROFILE_SCRIPT)"

release-governance-private:
	@bash "$(PRIVATE_GOVERNANCE_SCRIPT)"

release-install-private-governance-hooks:
	@bash "$(PRIVATE_HOOKS_INSTALL_SCRIPT)"

release-stability-burnin:
	@bash "$(STABILITY_BURNIN_SCRIPT)"

go-test:
	@cd "$(ROOT)/go-platform" && go work sync && go test ./modules/platform/... ./services/gateway/... ./services/auth/...

go-run-gateway:
	@cd "$(ROOT)/go-platform" && go run ./services/gateway/cmd/gateway

go-run-auth:
	@cd "$(ROOT)/go-platform" && go run ./services/auth/cmd/auth

go-reconciliation-report:
	@cd "$(ROOT)/go-platform/services/gateway" && \
		go run ./cmd/reconciliation-report \
			-fixture internal/http/testdata/reconciliation/lifecycle_cases.json \
			-out ../../../revival/artifacts/reconciliation_parity_report_2026-03-02.md

go-reconciliation-report-historical:
	@cd "$(ROOT)/go-platform/services/gateway" && \
		go run ./cmd/reconciliation-report \
			-fixture internal/http/testdata/reconciliation/lifecycle_cases.json \
			-historical-bets-csv "$(HISTORICAL_BETS_CSV)" \
			-out ../../../revival/artifacts/reconciliation_parity_report_historical_2026-03-02.md

go-reconciliation-report-historical-strict:
	@cd "$(ROOT)/go-platform/services/gateway" && \
		go run ./cmd/reconciliation-report \
			-fixture internal/http/testdata/reconciliation/lifecycle_cases.json \
			-historical-bets-csv "$(HISTORICAL_BETS_CSV)" \
			-fail-on-skipped \
			-out ../../../revival/artifacts/reconciliation_parity_report_historical_2026-03-02.md

go-reconciliation-report-historical-dir:
	@bash "$(ROOT)/scripts/reconciliation/historical-directory-parity.sh" "$(HISTORICAL_BETS_DIR)"
