package http

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// TestRegistrationAttributionLive (GAP-36) verifies the DB path: ensureUserSchema
// creates the affiliate_tag/signup_country columns and registration persists them
// (exercises the $11/$12 INSERT alignment the memory-mode test cannot). Opt-in:
// AUTH_REG_LIVE_DSN.
func TestRegistrationAttributionLive(t *testing.T) {
	dsn := os.Getenv("AUTH_REG_LIVE_DSN")
	if dsn == "" {
		t.Skip("AUTH_REG_LIVE_DSN not set; skipping live registration-attribution test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	auth := NewAuthService()
	if err := auth.ensureUserSchema(db); err != nil {
		t.Fatalf("ensureUserSchema: %v", err)
	}
	auth.db = db

	username := fmt.Sprintf("gap36-live-%d", time.Now().UnixNano())
	u, err := auth.RegisterWithAcceptance(username, "StrongPass123!", "", "terms-v1", "disc-v1", "aff-live-9", "us")
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	var affiliate, country string
	if err := db.QueryRow(`SELECT affiliate_tag, signup_country FROM auth_users WHERE id = $1`, u.ID).Scan(&affiliate, &country); err != nil {
		t.Fatalf("query auth_users: %v", err)
	}
	if affiliate != "aff-live-9" {
		t.Fatalf("affiliate_tag not persisted, got %q", affiliate)
	}
	if country != "US" {
		t.Fatalf("signup_country not persisted/normalized, got %q", country)
	}
}
