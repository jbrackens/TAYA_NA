package runtime

import "testing"

func TestLoadServiceConfigUsesDefaultPort(t *testing.T) {
	t.Setenv("PORT", "")

	cfg := LoadServiceConfig("gateway", "18080")
	if cfg.Port != "18080" {
		t.Fatalf("expected default port 18080, got %s", cfg.Port)
	}
	if cfg.Name != "gateway" {
		t.Fatalf("expected service name gateway, got %s", cfg.Name)
	}
}

func TestLoadServiceConfigUsesEnvPort(t *testing.T) {
	t.Setenv("PORT", "19001")

	cfg := LoadServiceConfig("gateway", "18080")
	if cfg.Port != "19001" {
		t.Fatalf("expected env port 19001, got %s", cfg.Port)
	}
}
