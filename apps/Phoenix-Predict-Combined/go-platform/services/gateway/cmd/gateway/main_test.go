package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

func TestPaymentsWebhookBypassesAuthAndCSRFMiddleware(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/payments/webhook", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	})

	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.Auth("http://127.0.0.1:1", gatewayPublicPrefixes()),
		httpx.CSRF(gatewayCSRFSkipPrefixes()),
	)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusAccepted {
		t.Fatalf("expected webhook request to bypass auth/csrf and reach handler, got %d", res.Code)
	}
}

func TestCashierProviderCallbackBypassesAuthAndCSRFMiddleware(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/provider-callbacks/relay", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	})

	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.Auth("http://127.0.0.1:1", gatewayPublicPrefixes()),
		httpx.CSRF(gatewayCSRFSkipPrefixes()),
	)

	req := httptest.NewRequest(http.MethodPost, "/v1/provider-callbacks/relay", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusAccepted {
		t.Fatalf("expected cashier provider callback to bypass auth/csrf and reach handler, got %d", res.Code)
	}
}

func TestPaymentsDepositStillRequiresAuthentication(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/payments/deposit", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	})

	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.Auth("http://127.0.0.1:1", gatewayPublicPrefixes()),
		httpx.CSRF(gatewayCSRFSkipPrefixes()),
	)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/deposit", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected deposit route to remain protected, got %d", res.Code)
	}
}

func TestValidateGatewayRuntimeConfigRequiresWebhookSecretInProduction(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "production"
		case "PAYMENTS_WEBHOOK_SECRET":
			return ""
		default:
			return ""
		}
	})

	if err == nil {
		t.Fatalf("expected production validation to require PAYMENTS_WEBHOOK_SECRET")
	}
}

func TestValidateGatewayRuntimeConfigBlocksLegacyCustodialCryptoRailInProduction(t *testing.T) {
	for _, legacyKey := range []string{"CRYPTO_RPC_URL", "CRYPTO_ASSET_CONTRACT", "CRYPTO_DEPOSIT_ADDRESS_SOURCE"} {
		t.Run(legacyKey, func(t *testing.T) {
			err := validateGatewayRuntimeConfig(func(key string) string {
				switch key {
				case "ENVIRONMENT":
					return "production"
				case "PAYMENTS_WEBHOOK_SECRET":
					return "whsec_test"
				case legacyKey:
					return "legacy-test-value"
				default:
					return ""
				}
			})

			if err == nil {
				t.Fatalf("expected production validation to block legacy custodial crypto rail config")
			}
		})
	}
}

func TestValidateGatewayRuntimeConfigAllowsMissingWebhookSecretInDevelopment(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		if key == "ENVIRONMENT" {
			return "development"
		}
		return ""
	})

	if err != nil {
		t.Fatalf("expected development validation to allow missing webhook secret, got %v", err)
	}
}

func TestValidateGatewayRuntimeConfigRefusesAuthDisabledInDeployedEnvs(t *testing.T) {
	for _, env := range []string{"production", "staging"} {
		err := validateGatewayRuntimeConfig(func(key string) string {
			switch key {
			case "ENVIRONMENT":
				return env
			case "GATEWAY_AUTH_ENABLED":
				return "false"
			case "PAYMENTS_WEBHOOK_SECRET":
				return "whsec_present"
			default:
				return ""
			}
		})

		if err == nil {
			t.Fatalf("expected boot refusal with auth disabled in %s", env)
		}
	}
}

func TestValidateGatewayRuntimeConfigAllowsAuthDisabledInDevelopment(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "development"
		case "GATEWAY_AUTH_ENABLED":
			return "false"
		default:
			return ""
		}
	})

	if err != nil {
		t.Fatalf("expected dev to allow the auth kill switch, got %v", err)
	}
}

func TestValidateGatewayRuntimeConfigRejectsDevWebhookSecretInDeployedEnvs(t *testing.T) {
	for _, env := range []string{"production", "staging"} {
		err := validateGatewayRuntimeConfig(func(key string) string {
			switch key {
			case "ENVIRONMENT":
				return env
			case "PAYMENTS_WEBHOOK_SECRET":
				return "whsec_local" // the dev placeholder
			default:
				return ""
			}
		})
		if err == nil {
			t.Fatalf("expected boot refusal for dev webhook secret in %s", env)
		}
	}
}

func TestValidateGatewayRuntimeConfigRejectsDevDBPasswordInProduction(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "production"
		case "PAYMENTS_WEBHOOK_SECRET":
			return "whsec_realsecret"
		case "GATEWAY_DB_DSN":
			return "postgres://predict:localdev@db:5432/predict?sslmode=disable"
		default:
			return ""
		}
	})
	if err == nil {
		t.Fatalf("expected boot refusal for dev database password in production")
	}
}

// prodBaseEnv is a passing production configuration: real secrets plus the
// deny-by-default compliance posture (geo allowlist on, KYC stated
// explicitly). Tests override single keys to probe each boot requirement.
func prodBaseEnv(overrides map[string]string) func(string) string {
	base := map[string]string{
		"ENVIRONMENT":              "production",
		"PAYMENTS_WEBHOOK_SECRET":  "whsec_a-real-and-strong-secret",
		"GATEWAY_DB_DSN":           "postgres://predict:S3cure-Prod-Pass@db.internal:5432/predict?sslmode=require",
		"WALLET_DB_DSN":            "postgres://predict:S3cure-Prod-Pass@db.internal:5432/predict?sslmode=require",
		"GEO_GATE_ENABLED":         "true",
		"GEO_ALLOWED_COUNTRIES":    "PH,TH,VN",
		"KYC_ENFORCEMENT":          "true",
		"KYC_REQUIRED_FOR_TRADING": "true",
	}
	for k, v := range overrides {
		base[k] = v
	}
	return func(key string) string { return base[key] }
}

func TestValidateGatewayRuntimeConfigAllowsRealSecretsInProduction(t *testing.T) {
	err := validateGatewayRuntimeConfig(prodBaseEnv(nil))
	if err != nil {
		t.Fatalf("expected production with real secrets and compliance posture to validate, got %v", err)
	}
}

func TestValidateGatewayRuntimeConfigRequiresDBAuditStoreInDeployedEnvs(t *testing.T) {
	// The provider-ops audit trail (append-only, migration 036) must be DB-backed
	// in a deployed environment; the mutable per-instance JSON-file fallback must
	// not boot (P3-06).
	if err := validateGatewayRuntimeConfig(prodBaseEnv(map[string]string{
		"PROVIDER_OPS_AUDIT_STORE_MODE": "file",
	})); err == nil {
		t.Fatalf("expected production boot refusal when the provider-ops audit store is file-backed")
	}
	// An explicit db mode (and the default unset-with-DSN, covered by the
	// passing prodBaseEnv case) validates.
	if err := validateGatewayRuntimeConfig(prodBaseEnv(map[string]string{
		"PROVIDER_OPS_AUDIT_STORE_MODE": "db",
	})); err != nil {
		t.Fatalf("expected db audit store mode to validate in production, got %v", err)
	}
}

func TestValidateGatewayRuntimeConfigRequiresGeoGateInDeployedEnvs(t *testing.T) {
	cases := map[string]map[string]string{
		"geo gate off":          {"GEO_GATE_ENABLED": ""},
		"geo gate false":        {"GEO_GATE_ENABLED": "false"},
		"empty allowlist":       {"GEO_ALLOWED_COUNTRIES": ""},
		"allowlist only commas": {"GEO_ALLOWED_COUNTRIES": " , ,"},
	}
	for name, overrides := range cases {
		t.Run(name, func(t *testing.T) {
			if err := validateGatewayRuntimeConfig(prodBaseEnv(overrides)); err == nil {
				t.Fatalf("expected production boot refusal with %s", name)
			}
		})
	}
}

func TestValidateGatewayRuntimeConfigRequiresExplicitKYCPostureInDeployedEnvs(t *testing.T) {
	for _, kycVar := range []string{"KYC_ENFORCEMENT", "KYC_REQUIRED_FOR_TRADING"} {
		t.Run(kycVar+" silently off", func(t *testing.T) {
			if err := validateGatewayRuntimeConfig(prodBaseEnv(map[string]string{kycVar: ""})); err == nil {
				t.Fatalf("expected production boot refusal when %s is silently off", kycVar)
			}
		})
		t.Run(kycVar+" acked off", func(t *testing.T) {
			err := validateGatewayRuntimeConfig(prodBaseEnv(map[string]string{
				kycVar:                   "",
				kycVar + "_ACK_DISABLED": "true",
			}))
			if err != nil {
				t.Fatalf("expected acked-off %s to validate, got %v", kycVar, err)
			}
		})
	}
}

func TestValidateGatewayRuntimeConfigRefusesPermissiveComplianceInProduction(t *testing.T) {
	err := validateGatewayRuntimeConfig(prodBaseEnv(map[string]string{
		"BETA_COMPLIANCE_MODE":   "permissive",
		"COMPLIANCE_STARTUP_ACK": "true",
	}))
	if err == nil {
		t.Fatalf("expected production boot refusal for permissive compliance mode even with ack")
	}
}

func TestValidateGatewayRuntimeConfigAckedPermissiveStagingSkipsGateRequirements(t *testing.T) {
	// Acked-permissive staging intentionally runs ungated (closed beta), so
	// the geo/KYC posture requirements must not apply there.
	err := validateGatewayRuntimeConfig(prodBaseEnv(map[string]string{
		"ENVIRONMENT":              "staging",
		"BETA_COMPLIANCE_MODE":     "permissive",
		"COMPLIANCE_STARTUP_ACK":   "true",
		"GEO_GATE_ENABLED":         "",
		"GEO_ALLOWED_COUNTRIES":    "",
		"KYC_ENFORCEMENT":          "",
		"KYC_REQUIRED_FOR_TRADING": "",
	}))
	if err != nil {
		t.Fatalf("expected acked-permissive staging to validate without geo/KYC posture, got %v", err)
	}
}

func TestValidateGatewayRuntimeConfigRequiresAckForPermissiveBetaComplianceInDeployedEnvs(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "staging"
		case "PAYMENTS_WEBHOOK_SECRET":
			return "whsec_a-real-and-strong-secret"
		case "GATEWAY_DB_DSN", "WALLET_DB_DSN":
			return "postgres://predict:S3cure-Prod-Pass@db.internal:5432/predict?sslmode=require"
		case "BETA_COMPLIANCE_MODE":
			return "permissive"
		default:
			return ""
		}
	})
	if err == nil {
		t.Fatalf("expected deployed permissive beta compliance mode to require COMPLIANCE_STARTUP_ACK=true")
	}
}

func TestValidateGatewayRuntimeConfigAllowsAckedPermissiveBetaComplianceInDeployedEnvs(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "staging"
		case "PAYMENTS_WEBHOOK_SECRET":
			return "whsec_a-real-and-strong-secret"
		case "GATEWAY_DB_DSN", "WALLET_DB_DSN":
			return "postgres://predict:S3cure-Prod-Pass@db.internal:5432/predict?sslmode=require"
		case "BETA_COMPLIANCE_MODE":
			return "permissive"
		case "COMPLIANCE_STARTUP_ACK":
			return "true"
		default:
			return ""
		}
	})
	if err != nil {
		t.Fatalf("expected acknowledged permissive beta compliance mode to validate, got %v", err)
	}
}
