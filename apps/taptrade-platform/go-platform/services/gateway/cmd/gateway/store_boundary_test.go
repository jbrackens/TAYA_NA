package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"taptrade/platform/transport/httpx"
)

// Point-store boundary pins (STORE_AND_PAYMENTS.md §7 / §10): the store
// webhook is public + CSRF-exempt ONLY under STORE_ENABLED=true, mirroring
// the legacy payments-webhook opt-in pattern. These are additive tests — the
// existing legacy-boundary pins in main_test.go are untouched.

func TestStoreWebhookNotPublicOrCSRFSkippedByDefault(t *testing.T) {
	t.Setenv("STORE_ENABLED", "")
	t.Setenv(legacyMoneyRoutesEnv, "")
	publicPrefixes := gatewayPublicPrefixes()
	csrfSkipPrefixes := gatewayCSRFSkipPrefixes()

	if matchesAnyPrefix("/api/v1/store/webhook", publicPrefixes) {
		t.Fatalf("/api/v1/store/webhook must not be public when the store is disabled; public prefixes=%v", publicPrefixes)
	}
	if matchesAnyPrefix("/api/v1/store/webhook", csrfSkipPrefixes) {
		t.Fatalf("/api/v1/store/webhook must not skip CSRF when the store is disabled; skip prefixes=%v", csrfSkipPrefixes)
	}
}

func TestStoreOptInOnlyExemptsTheWebhook(t *testing.T) {
	t.Setenv("STORE_ENABLED", "true")
	t.Setenv(legacyMoneyRoutesEnv, "")
	publicPrefixes := gatewayPublicPrefixes()
	csrfSkipPrefixes := gatewayCSRFSkipPrefixes()

	if !matchesAnyPrefix("/api/v1/store/webhook", publicPrefixes) {
		t.Fatalf("/api/v1/store/webhook should be public under store opt-in; public prefixes=%v", publicPrefixes)
	}
	if !matchesAnyPrefix("/api/v1/store/webhook", csrfSkipPrefixes) {
		t.Fatalf("/api/v1/store/webhook should skip CSRF under store opt-in; skip prefixes=%v", csrfSkipPrefixes)
	}

	// Every interactive store route stays session-authenticated + CSRF'd.
	interactivePaths := []string{
		"/api/v1/store/packs",
		"/api/v1/store/checkout",
		"/api/v1/store/purchases",
		"/api/v1/store/purchases/sp-1",
		"/api/v1/store/purchases/sp-1/confirm",
	}
	for _, path := range interactivePaths {
		if matchesAnyPrefix(path, publicPrefixes) {
			t.Fatalf("%s must still require auth under store opt-in; public prefixes=%v", path, publicPrefixes)
		}
		if matchesAnyPrefix(path, csrfSkipPrefixes) {
			t.Fatalf("%s must still require CSRF under store opt-in; skip prefixes=%v", path, csrfSkipPrefixes)
		}
	}

	// The store flag must not resurrect the legacy money exemptions.
	for _, legacyPath := range []string{"/api/v1/payments/webhook", "/v1/provider-callbacks/relay"} {
		if matchesAnyPrefix(legacyPath, publicPrefixes) {
			t.Fatalf("%s must not become public via the store flag; public prefixes=%v", legacyPath, publicPrefixes)
		}
		if matchesAnyPrefix(legacyPath, csrfSkipPrefixes) {
			t.Fatalf("%s must not skip CSRF via the store flag; skip prefixes=%v", legacyPath, csrfSkipPrefixes)
		}
	}
}

func TestStoreWebhookRequiresAuthByDefault(t *testing.T) {
	t.Setenv("STORE_ENABLED", "")
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/store/webhook", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	})

	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.Auth("http://127.0.0.1:1", gatewayPublicPrefixes()),
		httpx.CSRF(gatewayCSRFSkipPrefixes()),
	)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/store/webhook", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected store webhook to require auth by default, got %d", res.Code)
	}
}

func TestStoreWebhookBypassesAuthAndCSRFOnlyWhenStoreEnabled(t *testing.T) {
	t.Setenv("STORE_ENABLED", "true")
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/store/webhook", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	})

	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.Auth("http://127.0.0.1:1", gatewayPublicPrefixes()),
		httpx.CSRF(gatewayCSRFSkipPrefixes()),
	)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/store/webhook", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusAccepted {
		t.Fatalf("expected enabled-store webhook request to bypass auth/csrf and reach handler, got %d", res.Code)
	}
}

func TestStoreCheckoutStillRequiresAuthenticationWhenEnabled(t *testing.T) {
	t.Setenv("STORE_ENABLED", "true")
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/store/checkout", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	})

	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.Auth("http://127.0.0.1:1", gatewayPublicPrefixes()),
		httpx.CSRF(gatewayCSRFSkipPrefixes()),
	)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/store/checkout", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected checkout route to remain protected, got %d", res.Code)
	}
}

func TestValidateGatewayRuntimeConfigRequiresStoreWebhookSecretInDeployedEnvs(t *testing.T) {
	cases := []struct {
		name      string
		secret    string
		wantError bool
	}{
		{name: "missing secret", secret: "", wantError: true},
		{name: "dev placeholder", secret: "whsec_local", wantError: true},
		{name: "real secret", secret: "whsec_store_prod_secret", wantError: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateGatewayRuntimeConfig(prodBaseEnv(map[string]string{
				"STORE_ENABLED":        "true",
				"STORE_WEBHOOK_SECRET": tc.secret,
			}))
			if tc.wantError && err == nil {
				t.Fatalf("expected boot refusal for store %s in production", tc.name)
			}
			if !tc.wantError && err != nil {
				t.Fatalf("expected real store secret to validate in production, got %v", err)
			}
		})
	}
}

func TestValidateGatewayRuntimeConfigRefusesStripeStoreProvider(t *testing.T) {
	for _, env := range []string{"development", "production"} {
		t.Run(env, func(t *testing.T) {
			err := validateGatewayRuntimeConfig(func(key string) string {
				switch key {
				case "ENVIRONMENT":
					return env
				case "STORE_ENABLED":
					return "true"
				case "STORE_PROVIDER":
					return "stripe"
				case "STORE_WEBHOOK_SECRET":
					return "whsec_store_prod_secret"
				default:
					return ""
				}
			})
			if err == nil {
				t.Fatalf("expected boot refusal for the reserved stripe provider in %s", env)
			}
		})
	}
}

func TestValidateGatewayRuntimeConfigAllowsDormantStripeProviderVar(t *testing.T) {
	// STORE_PROVIDER=stripe with the store disabled is a dormant reserved
	// setting, not a boot error.
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "development"
		case "STORE_PROVIDER":
			return "stripe"
		default:
			return ""
		}
	})
	if err != nil {
		t.Fatalf("expected disabled store to ignore the reserved provider var, got %v", err)
	}
}

func TestValidateGatewayRuntimeConfigAllowsDemoStoreWithoutSecretInDevelopment(t *testing.T) {
	err := validateGatewayRuntimeConfig(func(key string) string {
		switch key {
		case "ENVIRONMENT":
			return "development"
		case "STORE_ENABLED":
			return "true"
		default:
			return ""
		}
	})
	if err != nil {
		t.Fatalf("expected dev demo store without a secret to validate, got %v", err)
	}
}
