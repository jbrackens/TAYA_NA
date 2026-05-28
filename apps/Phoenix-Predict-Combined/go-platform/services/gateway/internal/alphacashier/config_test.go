package alphacashier

import "testing"

func TestLoadConfigFromEnvDisabledDefaults(t *testing.T) {
	cfg, err := LoadConfigFromEnv(mapEnv(nil))
	if err != nil {
		t.Fatalf("LoadConfigFromEnv disabled: %v", err)
	}
	if cfg.Enabled {
		t.Fatalf("expected disabled by default")
	}
	if cfg.ChainID != 8453 || cfg.TokenSymbol != "USDC" || cfg.TokenDecimals != 6 {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
}

func TestLoadConfigFromEnvEnabledRequiresRPC(t *testing.T) {
	_, err := LoadConfigFromEnv(mapEnv(map[string]string{
		"ALPHA_CASHIER_ENABLED":          "true",
		"ALPHA_CASHIER_TOKEN_ADDRESS":    "0x0000000000000000000000000000000000000001",
		"ALPHA_CASHIER_TREASURY_ADDRESS": "0x0000000000000000000000000000000000000002",
	}))
	if err == nil {
		t.Fatalf("expected missing RPC URL to fail")
	}
}

func TestLoadConfigFromEnvEnabledValid(t *testing.T) {
	cfg, err := LoadConfigFromEnv(validEnv())
	if err != nil {
		t.Fatalf("LoadConfigFromEnv valid: %v", err)
	}
	if !cfg.Enabled {
		t.Fatalf("expected enabled")
	}
	if cfg.TokenAddress != "0x0000000000000000000000000000000000000001" {
		t.Fatalf("unexpected token address: %s", cfg.TokenAddress)
	}
}

func TestValidateRuntimeConfigRejectsWithdrawalReviewDisabledInProduction(t *testing.T) {
	env := map[string]string{
		"ENVIRONMENT":                              "production",
		"ALPHA_CASHIER_ENABLED":                    "true",
		"ALPHA_CASHIER_RPC_URL":                    "https://rpc.example",
		"ALPHA_CASHIER_TOKEN_ADDRESS":              "0x0000000000000000000000000000000000000001",
		"ALPHA_CASHIER_TREASURY_ADDRESS":           "0x0000000000000000000000000000000000000002",
		"ALPHA_CASHIER_WITHDRAWAL_REVIEW_REQUIRED": "false",
	}
	if err := ValidateRuntimeConfig(mapEnv(env)); err == nil {
		t.Fatalf("expected production runtime validation to reject disabled withdrawal review")
	}
}

func validEnv() func(string) string {
	return mapEnv(map[string]string{
		"ALPHA_CASHIER_ENABLED":          "true",
		"ALPHA_CASHIER_RPC_URL":          "https://rpc.example",
		"ALPHA_CASHIER_TOKEN_ADDRESS":    "0x0000000000000000000000000000000000000001",
		"ALPHA_CASHIER_TREASURY_ADDRESS": "0x0000000000000000000000000000000000000002",
	})
}

func mapEnv(values map[string]string) func(string) string {
	return func(key string) string {
		if values == nil {
			return ""
		}
		return values[key]
	}
}
