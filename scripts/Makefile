ROOT := /Users/johnb/Desktop/PhoenixBotRevival

.PHONY: help list infra-up infra-down sportsbook-deps-up sportsbook-run \
        waysun-rule-configurator-migrate waysun-rule-configurator-run \
        waysun-wallet-migrate waysun-wallet-run waysun-event-ingestor-run \
        talon-backoffice-run talon-core-setup talon-core-run \
        bridge-run

help:
	@echo "PhoenixBotRevival workspace commands"
	@echo ""
	@echo "Core:"
	@echo "  make infra-up"
	@echo "  make infra-down"
	@echo "  make sportsbook-deps-up"
	@echo "  make sportsbook-run"
	@echo ""
	@echo "Waysun/Stella:"
	@echo "  make waysun-rule-configurator-migrate"
	@echo "  make waysun-rule-configurator-run"
	@echo "  make waysun-wallet-migrate"
	@echo "  make waysun-wallet-run"
	@echo "  make waysun-event-ingestor-run"
	@echo ""
	@echo "Talon:"
	@echo "  make talon-backoffice-run"
	@echo "  make talon-core-setup"
	@echo "  make talon-core-run"
	@echo ""
	@echo "Integration Bridge:"
	@echo "  make bridge-run"
	@echo ""
	@echo "Docs:"
	@echo "  make list"

list:
	@echo "Canonical workspace map: $(ROOT)/docs/WORKSPACE.md"
	@echo "Compatibility workspace map: $(ROOT)/WORKSPACE.md"
	@echo "Canonical service catalog: $(ROOT)/configs/workspace/services.yaml"
	@echo "Compatibility service catalog: $(ROOT)/workspace/services.yaml"

infra-up:
	cd $(ROOT)/review/gmx-infrastructure/gmx-traefik/gmx-traefik && docker network create gmx-internal >/dev/null 2>&1 || true
	cd $(ROOT)/review/gmx-infrastructure/gmx-traefik/gmx-traefik && docker compose up -d

infra-down:
	cd $(ROOT)/review/gmx-infrastructure/gmx-traefik/gmx-traefik && docker compose down

sportsbook-deps-up:
	cd $(ROOT)/libs/phoenix-core/attaboy-phoenix-backend/phoenix-backend/dev && docker compose up -d postgres flyway keycloak cp-broker kafka-topics-ui

sportsbook-run:
	cd $(ROOT)/libs/phoenix-core/attaboy-phoenix-backend/phoenix-backend && sbt "phoenix-backend/runMain phoenix.main.LocalClusterApplication"

waysun-rule-configurator-migrate:
	cd $(ROOT)/review/gmx-waysun/gmx-waysun-rule-configurator/gmx-waysun-rule-configurator && docker compose -f resources/docker-compose/docker-compose.yml up rule-configurator-liquibase

waysun-rule-configurator-run:
	cd $(ROOT)/review/gmx-waysun/gmx-waysun-rule-configurator/gmx-waysun-rule-configurator && sbt rule-configurator/run

waysun-wallet-migrate:
	cd $(ROOT)/review/gmx-waysun/eeg-waysun-wallet/eeg-waysun-wallet && docker compose -f resources/docker-compose/docker-compose.yml up stella-wallet-liquibase

waysun-wallet-run:
	cd $(ROOT)/review/gmx-waysun/eeg-waysun-wallet/eeg-waysun-wallet && sbt wallet/run

waysun-event-ingestor-run:
	cd $(ROOT)/review/gmx-waysun/gmx-waysun-event-ingestor/gmx-waysun-event-ingestor && sbt event-ingestor/run

talon-backoffice-run:
	cd $(ROOT)/review/talon-backoffice/gstech-backoffice/gstech-backoffice && yarn start

talon-core-setup:
	cd $(ROOT)/review/talon-backoffice/gstech/gstech && yarn install && yarn env && yarn migrate && yarn bootstrap

talon-core-run:
	cd $(ROOT)/review/talon-backoffice/gstech/gstech && yarn start

bridge-run:
	cd $(ROOT)/review/gmx-infrastructure/gmx-nifi-rest/gmx-nifi-rest && docker compose up --build
