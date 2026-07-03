package ws

import (
	"net/http/httptest"
	"testing"
)

// TestCheckOriginFailsClosedInDeployedEnv (GAP-69): when WS_ALLOWED_ORIGINS is
// not configured, any deployed environment — including a non-canonical value
// like "prod"/"preprod" — must REJECT a cross-origin WebSocket connection, not
// fall through to the dev "allow all origins" branch. Only a known-dev env may
// allow all origins.
func TestCheckOriginFailsClosedInDeployedEnv(t *testing.T) {
	savedEnv, savedOrigins := wsEnvironment, allowedOrigins
	t.Cleanup(func() { wsEnvironment, allowedOrigins = savedEnv, savedOrigins })
	allowedOrigins = nil // unconfigured

	req := httptest.NewRequest("GET", "/ws", nil)
	req.Header.Set("Origin", "https://evil.example")

	for _, env := range []string{"production", "staging", "prod", "preprod", "produciton"} {
		wsEnvironment = env
		if upgrader.CheckOrigin(req) {
			t.Fatalf("deployed env %q with no allowed origins must reject the connection", env)
		}
	}
	// A known-dev env still allows all origins when none are configured.
	wsEnvironment = ""
	if !upgrader.CheckOrigin(req) {
		t.Fatal("dev with no allowed origins should allow all origins")
	}
}
