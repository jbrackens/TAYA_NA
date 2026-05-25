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

func TestValidateGatewayRuntimeConfigAllowsRealSecretsInProduction(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "production"
		case "PAYMENTS_WEBHOOK_SECRET":
			return "whsec_a-real-and-strong-secret"
		case "GATEWAY_DB_DSN", "WALLET_DB_DSN":
			return "postgres://predict:S3cure-Prod-Pass@db.internal:5432/predict?sslmode=require"
		default:
			return ""
		}
	})
	if err != nil {
		t.Fatalf("expected production with real secrets to validate, got %v", err)
	}
}
