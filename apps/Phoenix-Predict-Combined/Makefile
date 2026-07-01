SHELL := /bin/bash

# Resolve repo root from this Makefile location so targets work on any machine/CI clone path.
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
STACK_SCRIPT := $(ROOT)/scripts/local-stack.sh
JAVA_PROFILE_SCRIPT := $(ROOT)/scripts/runtime/java-profile.sh
SBOM_SCRIPT := $(ROOT)/scripts/security/generate-sbom.sh
MIGRATION_SCRIPT := $(ROOT)/scripts/data/validate-db-migrations.sh
GO_GATEWAY_MIGRATION_SCRIPT := $(ROOT)/scripts/data/validate-go-gateway-migrations.sh
SEED_SCRIPT := $(ROOT)/scripts/data/prepare-deterministic-seeds.sh
PLATFORM_HEALTH_SCRIPT := $(ROOT)/scripts/platform/health-check.sh
PLATFORM_METRICS_SCRIPT := $(ROOT)/scripts/platform/metrics-smoke.sh
E2E_SCRIPT := $(ROOT)/scripts/qa/go-critical-path-e2e.sh
PERF_SCRIPT := $(ROOT)/scripts/qa/go-load-baseline.sh
CAPABILITY_SLO_SCRIPT := $(ROOT)/scripts/qa/go-capability-slo-gate.sh
CONFORMANCE_SCRIPT := $(ROOT)/scripts/qa/go-provider-conformance.sh
REGRESSION_PACK_SCRIPT := $(ROOT)/scripts/qa/go-regression-pack.sh
CHAOS_SUITE_SCRIPT := $(ROOT)/scripts/qa/go-provider-chaos-suite.sh
ABUSE_BOUNDARY_SCRIPT := $(ROOT)/scripts/qa/abuse-boundary-proof.sh
CANONICAL_BROWSER_JOURNEY_SCRIPT := $(ROOT)/scripts/qa/canonical-browser-journey.sh
CANONICAL_BROWSER_STACK_SCRIPT := $(ROOT)/scripts/qa/canonical-browser-stack.sh
SPORTS_ROUTE_SMOKE_SCRIPT := $(ROOT)/scripts/qa/sports-route-smoke.sh
SPORTS_REGRESSION_GATE_SCRIPT := $(ROOT)/scripts/qa/sports-regression-gate.sh
PRESERVATION_DELETION_GATE_SCRIPT := $(ROOT)/scripts/qa/preservation-deletion-gate.sh
PRESERVATION_MODIFICATION_GATE_SCRIPT := $(ROOT)/scripts/qa/preservation-modification-gate.sh
PRESERVATION_CONTRACT_ANCHOR_GATE_SCRIPT := $(ROOT)/scripts/qa/preservation-contract-anchor-gate.sh
PRESERVATION_PRODUCTION_DOSSIER_SCRIPT := $(ROOT)/scripts/qa/preservation-production-dossier.sh
SCENARIO_11_API_SURFACE_GATE_SCRIPT := $(ROOT)/scripts/qa/scenario-11-api-surface-gate.sh
LIVE_NO_MONEY_BOUNDARY_SCRIPT := $(ROOT)/scripts/qa/live-no-money-boundary.sh
SCENARIO_12_SIGNOFF_GATE_SCRIPT := $(ROOT)/scripts/qa/scenario-12-signoff-gate.sh
FRONTEND_RESIDUAL_ADVISORY_GATE_SCRIPT := $(ROOT)/scripts/qa/frontend-residual-advisory-gate.sh
JVM_DIRECT_RESIDUAL_ADVISORY_GATE_SCRIPT := $(ROOT)/scripts/qa/jvm-direct-residual-advisory-gate.sh
JVM_RESOLVED_RESIDUAL_ADVISORY_GATE_SCRIPT := $(ROOT)/scripts/qa/jvm-resolved-residual-advisory-gate.sh
JVM_OSV_DIRECT_BASELINE_SCRIPT := $(ROOT)/scripts/security/jvm-osv-direct-baseline.sh
JVM_OSV_RESOLVED_CLASSPATH_BASELINE_SCRIPT := $(ROOT)/scripts/security/jvm-osv-resolved-classpath-baseline.sh
RC_COMPLETION_AUDIT_GATE_SCRIPT := $(ROOT)/scripts/qa/rc-completion-audit-gate.sh
CUTOVER_SCRIPT := $(ROOT)/scripts/release/cutover-rehearsal.sh
LAUNCH_GATE_SCRIPT := $(ROOT)/scripts/release/launch-readiness-gate.sh
RUNTIME_GATE_PROFILE_SCRIPT := $(ROOT)/scripts/release/runtime-gate-profile.sh
STABILITY_BURNIN_SCRIPT := $(ROOT)/scripts/release/stabilization-burnin.sh
PRIVATE_GOVERNANCE_SCRIPT := $(ROOT)/scripts/release/private-governance-enforce.sh
PRIVATE_HOOKS_INSTALL_SCRIPT := $(ROOT)/scripts/release/install-private-governance-hooks.sh
PREDICTION_RECONCILIATION_FIXTURE := internal/http/testdata/prediction_reconciliation/lifecycle_cases.json
PREDICTION_RECONCILIATION_REPORT := ../../../revival/artifacts/prediction_reconciliation_report_$(shell date +%F).md
HISTORICAL_BETS_CSV ?= $(ROOT)/phoenix-backend/services/src/test/resources/data/reports/application/multiple-states-bets.csv
HISTORICAL_BETS_DIR ?= $(ROOT)/phoenix-backend/services/src/test/resources/data/reports/application

.PHONY: help bootstrap start stop restart status logs java-profile verify verify-backend verify-talon verify-sportsbook verify-go verify-api-contract-fixtures frontend-deps-baseline security-secrets security-deps security-jvm security-jvm-required security-jvm-osv-direct security-jvm-osv-resolved-classpath security-jvm-direct-residual-advisories security-jvm-resolved-residual-advisories security-sbom security-baseline validate-migrations validate-go-migrations seed-deterministic platform-health platform-metrics qa-e2e-critical qa-load-baseline qa-capability-slo qa-provider-conformance qa-regression-pack qa-provider-chaos qa-abuse-boundary qa-canonical-browser-journey qa-canonical-browser-stack qa-sports-route-smoke qa-sports-regression qa-preservation-deletions qa-preservation-modifications qa-preservation-contract-anchors qa-preservation-production-dossier qa-scenario-11-api-surface qa-live-no-money-boundary qa-scenario-12-signoff qa-frontend-residual-advisories qa-rc-completion-audit release-cutover-rehearsal release-launch-readiness release-launch-readiness-runtime release-launch-readiness-runtime-profile release-governance-private release-install-private-governance-hooks release-stability-burnin go-test go-run-gateway go-run-auth go-reconciliation-report go-reconciliation-report-historical go-reconciliation-report-historical-strict go-reconciliation-report-historical-dir

help:
	@echo "Available targets:"
	@echo "  make bootstrap         # install deps + local env files"
	@echo "  make start             # start backend + go-gateway + Talon + Tiangge player"
	@echo "  make stop              # stop started services"
	@echo "  make restart           # restart all services"
	@echo "  make status            # show service and HTTP health status"
	@echo "  make logs              # tail logs for all services"
	@echo "  make java-profile      # print/export Java 21 transitional profile (fallback to Java 17)"
	@echo "  make verify            # run the full quality gate"
	@echo "  make verify-backend    # backend compile + test compile"
	@echo "  make verify-talon      # Talon bootstrap + office build"
	@echo "  make verify-sportsbook # compatibility alias for Tiangge player app typecheck + build"
	@echo "  make verify-go         # SB-501/502/503 gates + strict historical reconciliation parity"
	@echo "  make verify-api-contract-fixtures # Tiangge API/client contract fixture regression gate"
	@echo "  make frontend-deps-baseline # capture Talon/Tiangge player outdated dependency baseline report"
	@echo "  make security-secrets  # run secret scan baseline report"
	@echo "  make security-deps     # run dependency vulnerability baseline report"
	@echo "  make security-jvm      # run JVM/SBT dependency baseline report"
	@echo "  make security-jvm-required # fail when JVM/SBT dependency baseline cannot run"
	@echo "  make security-jvm-osv-direct # query OSV for declared direct JVM dependencies"
	@echo "  make security-jvm-osv-resolved-classpath # query OSV for SBT-resolved JVM classpath"
	@echo "  make security-jvm-direct-residual-advisories # fail on new direct JVM OSV findings beyond reviewed residuals"
	@echo "  make security-jvm-resolved-residual-advisories # fail on unreviewed resolved JVM OSV findings"
	@echo "  make security-sbom     # generate SBOM artifacts across major components"
	@echo "  make security-baseline # run all security baseline reports"
	@echo "  make validate-migrations # validate Flyway migrations from clean Postgres state"
	@echo "  make validate-go-migrations # validate Go gateway SQL migrations from clean Postgres state"
	@echo "  make seed-deterministic  # materialize deterministic local seed files/env"
	@echo "  make platform-health   # run health/readiness/liveness smoke checks"
	@echo "  make platform-metrics  # run metrics endpoint smoke checks"
	@echo "  make qa-e2e-critical   # run Go launch-boundary + point reconciliation proof bundle"
	@echo "  make qa-load-baseline  # run API load/perf baseline harness"
	@echo "  make qa-capability-slo # run launch-boundary + point reconciliation capability gate"
	@echo "  make qa-provider-conformance # run SB-501 provider conformance suite"
	@echo "  make qa-regression-pack # run SB-502 canonical regression test pack"
	@echo "  make qa-provider-chaos # run SB-503 provider chaos suite + thresholds"
	@echo "  make qa-abuse-boundary # prove reward/social multi-account abuse controls"
	@echo "  make qa-canonical-browser-journey # run seeded-stack canonical browser journey proof"
	@echo "  make qa-canonical-browser-stack # start an ephemeral seeded stack and run canonical browser proof"
	@echo "  make qa-sports-route-smoke # compatibility alias for Tiangge discovery route contracts"
	@echo "  make qa-sports-regression # compatibility alias for Tiangge discovery/API contract regression"
	@echo "  make qa-preservation-deletions # classify deleted inherited artifacts before commit/review"
	@echo "  make qa-preservation-modifications # classify modified inherited artifacts before commit/review"
	@echo "  make qa-preservation-contract-anchors # compare inherited public contract anchors against HEAD"
	@echo "  make qa-preservation-production-dossier # summarize inherited production-logic preservation risk"
	@echo "  make qa-scenario-11-api-surface # verify Scenario 11 API/data surface requirements"
	@echo "  make qa-live-no-money-boundary # probe running player/office/gateway retired money paths"
	@echo "  make qa-scenario-12-signoff # fail until security residual and preservation signoffs are recorded"
	@echo "  make qa-frontend-residual-advisories # fail on new high/critical frontend advisories beyond reviewed Lerna residuals"
	@echo "  make qa-rc-completion-audit # fail until all 12 spec scenarios are Pass with evidence"
	@echo "  make release-cutover-rehearsal # run cutover/rollback rehearsal checklist"
	@echo "  make release-launch-readiness # run phase-9 launch readiness gate checklist"
	@echo "  make release-launch-readiness-runtime # launch readiness + optional Tiangge discovery/API compatibility gate"
	@echo "  make release-launch-readiness-runtime-profile # managed runtime profile (start stack, wait, run runtime gate, teardown)"
	@echo "  make release-governance-private # private-repo governance fallback gate bundle"
	@echo "  make release-install-private-governance-hooks # install release-ref pre-push governance hook"
	@echo "  make release-stability-burnin # run phase-10 post-launch stabilization burn-in"
	@echo "  make go-test           # run tests across go-platform workspace"
	@echo "  make go-run-gateway    # run Go gateway service"
	@echo "  make go-run-auth       # run Go auth service"
	@echo "  make go-reconciliation-report # run point-native prediction reconciliation report"
	@echo "  make go-reconciliation-report-historical # compatibility alias for point-native prediction reconciliation"
	@echo "  make go-reconciliation-report-historical-strict # compatibility alias for point-native prediction reconciliation"
	@echo "  make go-reconciliation-report-historical-dir # write retired historical bet CSV replay notice and point-native report"

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

verify-go: validate-go-migrations
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

security-jvm-required:
	@JVM_DEPENDENCY_BASELINE_STRICT=1 bash "$(ROOT)/scripts/security/jvm-dependency-baseline.sh"

security-jvm-osv-direct:
	@bash "$(JVM_OSV_DIRECT_BASELINE_SCRIPT)"

security-jvm-osv-resolved-classpath:
	@bash "$(JVM_OSV_RESOLVED_CLASSPATH_BASELINE_SCRIPT)"

security-jvm-direct-residual-advisories:
	@bash "$(JVM_DIRECT_RESIDUAL_ADVISORY_GATE_SCRIPT)"

security-jvm-resolved-residual-advisories:
	@bash "$(JVM_RESOLVED_RESIDUAL_ADVISORY_GATE_SCRIPT)"

security-sbom:
	@bash "$(SBOM_SCRIPT)"

security-baseline: security-secrets security-deps security-jvm security-jvm-osv-direct security-jvm-osv-resolved-classpath security-jvm-direct-residual-advisories security-sbom

validate-migrations:
	@bash "$(MIGRATION_SCRIPT)"

validate-go-migrations:
	@bash "$(GO_GATEWAY_MIGRATION_SCRIPT)"

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

qa-abuse-boundary:
	@bash "$(ABUSE_BOUNDARY_SCRIPT)"

qa-canonical-browser-journey:
	@bash "$(CANONICAL_BROWSER_JOURNEY_SCRIPT)"

qa-canonical-browser-stack:
	@bash "$(CANONICAL_BROWSER_STACK_SCRIPT)"

qa-sports-route-smoke:
	@bash "$(SPORTS_ROUTE_SMOKE_SCRIPT)"

qa-sports-regression:
	@bash "$(SPORTS_REGRESSION_GATE_SCRIPT)"

qa-preservation-deletions:
	@bash "$(PRESERVATION_DELETION_GATE_SCRIPT)"

qa-preservation-modifications:
	@bash "$(PRESERVATION_MODIFICATION_GATE_SCRIPT)"

qa-preservation-contract-anchors:
	@bash "$(PRESERVATION_CONTRACT_ANCHOR_GATE_SCRIPT)"

qa-preservation-production-dossier:
	@bash "$(PRESERVATION_PRODUCTION_DOSSIER_SCRIPT)"

qa-scenario-11-api-surface:
	@bash "$(SCENARIO_11_API_SURFACE_GATE_SCRIPT)"

qa-live-no-money-boundary:
	@bash "$(LIVE_NO_MONEY_BOUNDARY_SCRIPT)"

qa-scenario-12-signoff:
	@bash "$(SCENARIO_12_SIGNOFF_GATE_SCRIPT)"

qa-frontend-residual-advisories:
	@bash "$(FRONTEND_RESIDUAL_ADVISORY_GATE_SCRIPT)"

qa-rc-completion-audit:
	@bash "$(RC_COMPLETION_AUDIT_GATE_SCRIPT)"

release-cutover-rehearsal:
	@bash "$(CUTOVER_SCRIPT)"

release-launch-readiness:
	@bash "$(LAUNCH_GATE_SCRIPT)"

release-launch-readiness-runtime:
	@RUN_TIANGGE_DISCOVERY_CONTRACT_GATE=1 bash "$(LAUNCH_GATE_SCRIPT)"

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
		go run ./cmd/prediction-reconciliation-report \
			-fixture "$(PREDICTION_RECONCILIATION_FIXTURE)" \
			-out "$(PREDICTION_RECONCILIATION_REPORT)"

go-reconciliation-report-historical:
	@echo "Historical bet CSV replay is retired for launch; running point-native prediction reconciliation instead."
	@$(MAKE) go-reconciliation-report

go-reconciliation-report-historical-strict:
	@echo "Strict historical bet CSV replay is retired for launch; running point-native prediction reconciliation instead."
	@$(MAKE) go-reconciliation-report

go-reconciliation-report-historical-dir:
	@bash "$(ROOT)/scripts/reconciliation/historical-directory-parity.sh" "$(HISTORICAL_BETS_DIR)"
