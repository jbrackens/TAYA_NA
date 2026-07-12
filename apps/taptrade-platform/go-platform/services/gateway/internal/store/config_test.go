package store

import (
	"strings"
	"testing"
)

func envMap(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoadConfigFromEnvDisabledByDefault(t *testing.T) {
	cfg, err := LoadConfigFromEnv(envMap(nil))
	if err != nil {
		t.Fatalf("expected disabled store to load, got %v", err)
	}
	if cfg.Enabled {
		t.Fatalf("store must be disabled when STORE_ENABLED is unset")
	}
}

func TestLoadConfigFromEnvDefaultsToDemoProvider(t *testing.T) {
	cfg, err := LoadConfigFromEnv(envMap(map[string]string{
		"STORE_ENABLED":        "true",
		"STORE_WEBHOOK_SECRET": "whsec_test",
	}))
	if err != nil {
		t.Fatalf("expected enabled demo store to load, got %v", err)
	}
	if !cfg.Enabled || cfg.Provider != ProviderDemo {
		t.Fatalf("expected enabled demo config, got %+v", cfg)
	}
	if cfg.WebhookSecret != "whsec_test" {
		t.Fatalf("webhook secret not bound: %+v", cfg)
	}
}

func TestLoadConfigFromEnvRefusesStripeProvider(t *testing.T) {
	_, err := LoadConfigFromEnv(envMap(map[string]string{
		"STORE_ENABLED":  "true",
		"STORE_PROVIDER": "stripe",
	}))
	if err == nil {
		t.Fatalf("expected STORE_PROVIDER=stripe to be refused as reserved")
	}
	if !strings.Contains(err.Error(), "not implemented") {
		t.Fatalf("expected a clear not-implemented error, got %v", err)
	}
}

func TestLoadConfigFromEnvIgnoresStripeWhenDisabled(t *testing.T) {
	cfg, err := LoadConfigFromEnv(envMap(map[string]string{
		"STORE_PROVIDER": "stripe",
	}))
	if err != nil {
		t.Fatalf("a disabled store must not validate its provider, got %v", err)
	}
	if cfg.Enabled {
		t.Fatalf("expected disabled config, got %+v", cfg)
	}
}

func TestLoadConfigFromEnvRejectsUnknownProvider(t *testing.T) {
	if _, err := LoadConfigFromEnv(envMap(map[string]string{
		"STORE_ENABLED":  "true",
		"STORE_PROVIDER": "paypal",
	})); err == nil {
		t.Fatalf("expected unknown provider to be rejected")
	}
}

func TestLoadConfigFromEnvBindsFirstPurchaseBonusBps(t *testing.T) {
	cfg, err := LoadConfigFromEnv(envMap(map[string]string{
		"STORE_ENABLED":                  "true",
		"STORE_FIRST_PURCHASE_BONUS_BPS": "1000",
	}))
	if err != nil {
		t.Fatalf("expected bonus bps to bind, got %v", err)
	}
	if cfg.FirstPurchaseBonusBps != 1000 {
		t.Fatalf("expected 1000 bps, got %d", cfg.FirstPurchaseBonusBps)
	}

	for _, bad := range []string{"-1", "10001", "ten"} {
		if _, err := LoadConfigFromEnv(envMap(map[string]string{
			"STORE_ENABLED":                  "true",
			"STORE_FIRST_PURCHASE_BONUS_BPS": bad,
		})); err == nil {
			t.Fatalf("expected bonus bps %q to be rejected", bad)
		}
	}
}

func TestValidateRuntimeConfigRequiresRealSecretInDeployedEnvs(t *testing.T) {
	cases := []struct {
		name      string
		secret    string
		wantError bool
	}{
		{name: "missing secret", secret: "", wantError: true},
		{name: "dev placeholder", secret: "whsec_local", wantError: true},
		{name: "real secret", secret: "whsec_store_real_secret", wantError: false},
	}
	for _, env := range []string{"production", "staging"} {
		for _, tc := range cases {
			t.Run(env+"/"+tc.name, func(t *testing.T) {
				err := ValidateRuntimeConfig(envMap(map[string]string{
					"ENVIRONMENT":          env,
					"STORE_ENABLED":        "true",
					"STORE_WEBHOOK_SECRET": tc.secret,
				}))
				if tc.wantError && err == nil {
					t.Fatalf("expected boot refusal for %s secret in %s", tc.name, env)
				}
				if !tc.wantError && err != nil {
					t.Fatalf("expected real secret to validate in %s, got %v", env, err)
				}
			})
		}
	}
}

func TestValidateRuntimeConfigAllowsDemoWithoutSecretInDevelopment(t *testing.T) {
	err := ValidateRuntimeConfig(envMap(map[string]string{
		"ENVIRONMENT":   "development",
		"STORE_ENABLED": "true",
	}))
	if err != nil {
		t.Fatalf("expected dev demo store without secret to validate, got %v", err)
	}
}

func TestValidateRuntimeConfigNoopWhenDisabled(t *testing.T) {
	err := ValidateRuntimeConfig(envMap(map[string]string{
		"ENVIRONMENT": "production",
	}))
	if err != nil {
		t.Fatalf("expected disabled store to skip boot validation, got %v", err)
	}
}
