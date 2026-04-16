package http

import (
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	// Tests in this package don't run through the Auth middleware (they use
	// httpx.Chain without Auth()), so admin endpoints would always fail with
	// 403. Enable the dev-only admin bypass for the test suite.
	os.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "true")
	os.Exit(m.Run())
}
