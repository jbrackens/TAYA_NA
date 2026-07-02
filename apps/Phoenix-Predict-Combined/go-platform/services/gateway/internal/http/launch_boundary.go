package http

import (
	"os"
	"strings"
)

const legacyMoneyRoutesEnv = "TIANGGE_LEGACY_MONEY_ROUTES_ENABLED"

func legacyMoneyRoutesEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv(legacyMoneyRoutesEnv)), "true")
}
