package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestComposeGatewayAuthRateLimitRecovery(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_rate_limit_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	gatewayPort := freePort(t)

	userSvc := startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
		"PORT":           fmt.Sprintf("%d", userPort),
		"DATABASE_URL":   testDSN,
		"REDIS_ADDR":     redisAddr,
		"REDIS_PASSWORD": redisPassword,
		"JWT_SECRET":     secret,
		"JWT_ISSUER":     issuer,
		"JWT_AUDIENCE":   audience,
	}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort))
	defer userSvc.Stop()

	gatewaySvc := startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
		"PORT":               fmt.Sprintf("%d", gatewayPort),
		"REDIS_ADDR":         redisAddr,
		"REDIS_PASSWORD":     redisPassword,
		"JWT_SECRET_KEY":     secret,
		"JWT_ISSUER":         issuer,
		"JWT_AUDIENCE":       audience,
		"PHOENIX_USER_URL":   fmt.Sprintf("http://127.0.0.1:%d", userPort),
	}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort))
	defer gatewaySvc.Stop()

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	registerUser(t, gatewayBase, map[string]any{
		"email":         "ratelimit@example.com",
		"username":      "ratelimit1",
		"password":      "Password123!",
		"first_name":    "Rate",
		"last_name":     "Limit",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})

	for range 5 {
		loginUser(t, gatewayBase, "ratelimit1", "Password123!")
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/auth/login", "", map[string]any{
		"identifier": "ratelimit1",
		"password":   "Password123!",
	}, nil, http.StatusTooManyRequests)

	flushRedis(t, ctx, redisAddr, redisPassword)
	loginUser(t, gatewayBase, "ratelimit1", "Password123!")
}

func TestComposeGatewayDownstreamRecovery(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_recovery_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	socialPort := freePort(t)
	gatewayPort := freePort(t)

	userSvc := startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
		"PORT":           fmt.Sprintf("%d", userPort),
		"DATABASE_URL":   testDSN,
		"REDIS_ADDR":     redisAddr,
		"REDIS_PASSWORD": redisPassword,
		"JWT_SECRET":     secret,
		"JWT_ISSUER":     issuer,
		"JWT_AUDIENCE":   audience,
	}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort))
	defer userSvc.Stop()

	socialEnv := map[string]string{
		"PORT":           fmt.Sprintf("%d", socialPort),
		"DATABASE_URL":   testDSN,
		"JWT_SECRET":     secret,
		"JWT_ISSUER":     issuer,
		"JWT_AUDIENCE":   audience,
		"OUTBOX_ENABLED": "false",
	}
	socialSvc := startService(t, ctx, filepath.Join(root, "phoenix-social"), socialEnv, fmt.Sprintf("http://127.0.0.1:%d/health", socialPort))
	defer func() {
		if socialSvc != nil {
			socialSvc.Stop()
		}
	}()

	gatewaySvc := startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
		"PORT":               fmt.Sprintf("%d", gatewayPort),
		"REDIS_ADDR":         redisAddr,
		"REDIS_PASSWORD":     redisPassword,
		"JWT_SECRET_KEY":     secret,
		"JWT_ISSUER":         issuer,
		"JWT_AUDIENCE":       audience,
		"PHOENIX_USER_URL":   fmt.Sprintf("http://127.0.0.1:%d", userPort),
		"PHOENIX_SOCIAL_URL": fmt.Sprintf("http://127.0.0.1:%d", socialPort),
	}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort))
	defer gatewaySvc.Stop()

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	player := registerUser(t, gatewayBase, map[string]any{
		"email":         "recovery-player@example.com",
		"username":      "recover1",
		"password":      "Password123!",
		"first_name":    "Recover",
		"last_name":     "Player",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "recovery-admin@example.com",
		"username":      "recoveradmin1",
		"password":      "Password123!",
		"first_name":    "Recover",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1988-01-01",
	})

	playerToken := loginUser(t, gatewayBase, "recover1", "Password123!")
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/users/"+player.UserID+"/follow/"+admin.UserID, playerToken, nil, nil, http.StatusCreated)

	var followers socialFollowers
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+admin.UserID+"/followers", "", nil, &followers, http.StatusOK)
	if len(followers.Data) != 1 || followers.Data[0].UserID != player.UserID {
		t.Fatalf("expected initial social response before outage, got %+v", followers.Data)
	}

	socialSvc.Stop()
	socialSvc = nil

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+admin.UserID+"/followers", "", nil, nil, http.StatusBadGateway)

	socialSvc = startService(t, ctx, filepath.Join(root, "phoenix-social"), socialEnv, fmt.Sprintf("http://127.0.0.1:%d/health", socialPort))

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+admin.UserID+"/followers", "", nil, &followers, http.StatusOK)
	if len(followers.Data) != 1 || followers.Data[0].UserID != player.UserID {
		t.Fatalf("expected social route recovery after restart, got %+v", followers.Data)
	}
}
