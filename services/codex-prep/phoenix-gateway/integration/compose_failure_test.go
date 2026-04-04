package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestComposeSettlementFailuresDoNotPersistState(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_failure_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
	settlementPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
			"PORT":           fmt.Sprintf("%d", eventsPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
			"PORT":          fmt.Sprintf("%d", marketPort),
			"DATABASE_URL":  testDSN,
			"JWT_SECRET":    secret,
			"JWT_ISSUER":    issuer,
			"JWT_AUDIENCE":  audience,
			"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
			"PORT":              fmt.Sprintf("%d", bettingPort),
			"DATABASE_URL":      testDSN,
			"JWT_SECRET":        secret,
			"JWT_ISSUER":        issuer,
			"JWT_AUDIENCE":      audience,
			"OUTBOX_ENABLED":    "false",
			"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-settlement"), map[string]string{
			"PORT":           fmt.Sprintf("%d", settlementPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", settlementPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":                       fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":                 redisAddr,
			"REDIS_PASSWORD":             redisPassword,
			"JWT_SECRET_KEY":             secret,
			"JWT_ISSUER":                 issuer,
			"JWT_AUDIENCE":               audience,
			"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
			"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
			"PHOENIX_SETTLEMENT_URL":     fmt.Sprintf("http://127.0.0.1:%d", settlementPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	player := registerUser(t, gatewayBase, map[string]any{
		"email":         "failure-player@example.com",
		"username":      "failureplayer1",
		"password":      "Password123!",
		"first_name":    "Failure",
		"last_name":     "Player",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "failure-admin@example.com",
		"username":      "failureadmin1",
		"password":      "Password123!",
		"first_name":    "Failure",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	operator := registerUser(t, gatewayBase, map[string]any{
		"email":         "failure-operator@example.com",
		"username":      "failoperator1",
		"password":      "Password123!",
		"first_name":    "Failure",
		"last_name":     "Operator",
		"country":       "MT",
		"date_of_birth": "1988-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")
	setUserRole(t, ctx, testDSN, operator.UserID, "settlement_operator")

	playerToken := loginUser(t, gatewayBase, "failureplayer1", "Password123!")
	adminToken := loginUser(t, gatewayBase, "failureadmin1", "Password123!")
	operatorToken := loginUser(t, gatewayBase, "failoperator1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/deposits", playerToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_failure_123", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "failure_feed_evt_1",
		"sport":             "soccer",
		"league":            "Serie A",
		"home_team":         "Roma",
		"away_team":         "Milan",
		"scheduled_start":   time.Now().UTC().Add(90 * time.Minute).Format(time.RFC3339),
		"venue":             "Stadio Olimpico",
		"country":           "Italy",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Roma", "outcome_id": "aaaaaaaa-1111-1111-1111-111111111111"},
			{"name": "Milan", "outcome_id": "bbbbbbbb-2222-2222-2222-222222222222"},
		},
		"odds": map[string]any{
			"aaaaaaaa-1111-1111-1111-111111111111": 2.35,
			"bbbbbbbb-2222-2222-2222-222222222222": 1.75,
		},
	}, &market, http.StatusCreated)

	var bet placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerToken, map[string]any{
		"user_id":    player.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "aaaaaaaa-1111-1111-1111-111111111111",
		"stake":      10.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       2.35,
	}, &bet, http.StatusCreated)

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/settlement-batches", operatorToken, map[string]any{
		"market_ids":       []string{market.MarketID},
		"winning_outcomes": map[string]any{},
		"settlement_type":  "automatic",
	}, nil, http.StatusBadRequest)

	if countTableRows(t, ctx, testDSN, "settlement_batches") != 0 {
		t.Fatalf("expected no settlement batches after invalid payload")
	}

	var batch settlementBatch
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/settlement-batches", operatorToken, map[string]any{
		"market_ids": []string{market.MarketID},
		"winning_outcomes": map[string]any{
			market.MarketID: "aaaaaaaa-1111-1111-1111-111111111111",
		},
		"settlement_type": "automatic",
	}, &batch, http.StatusAccepted)

	if batch.BatchID == "" {
		t.Fatalf("expected valid settlement batch id")
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/reconciliation", operatorToken, map[string]any{
		"batch_id":            batch.BatchID,
		"reconciliation_type": "full_audit",
	}, nil, http.StatusBadRequest)

	if countTableRows(t, ctx, testDSN, "reconciliations") != 0 {
		t.Fatalf("expected no reconciliations after forbidden operator request")
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/reconciliation", adminToken, map[string]any{
		"batch_id":            "00000000-0000-0000-0000-000000000999",
		"reconciliation_type": "full_audit",
	}, nil, http.StatusNotFound)

	if countTableRows(t, ctx, testDSN, "reconciliations") != 0 {
		t.Fatalf("expected no reconciliations after missing batch request")
	}

	manualPayoutsBefore := countTableRows(t, ctx, testDSN, "manual_payouts")
	walletTransactionsBefore := countTableRows(t, ctx, testDSN, "wallet_transactions")
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/payouts/manual", adminToken, map[string]any{
		"user_id":      "00000000-0000-0000-0000-000000000777",
		"amount":       12.50,
		"reason":       "missing_user_compensation_check",
		"reference_id": bet.BetID,
	}, nil, http.StatusNotFound)

	if countTableRows(t, ctx, testDSN, "manual_payouts") != manualPayoutsBefore {
		t.Fatalf("expected no manual payout row after missing-user payout request")
	}
	if countTableRows(t, ctx, testDSN, "wallet_transactions") != walletTransactionsBefore {
		t.Fatalf("expected no wallet transaction after missing-user payout request")
	}
}

func TestComposeBetPlacementWalletFailureDoesNotPersistBet(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_wallet_failure_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
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

	walletSvc := startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
		"PORT":           fmt.Sprintf("%d", walletPort),
		"DATABASE_URL":   testDSN,
		"REDIS_ADDR":     redisAddr,
		"REDIS_PASSWORD": redisPassword,
		"OUTBOX_ENABLED": "false",
		"JWT_SECRET":     secret,
		"JWT_ISSUER":     issuer,
		"JWT_AUDIENCE":   audience,
	}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort))
	defer func() {
		if walletSvc != nil {
			walletSvc.Stop()
		}
	}()

	eventsSvc := startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
		"PORT":           fmt.Sprintf("%d", eventsPort),
		"DATABASE_URL":   testDSN,
		"JWT_SECRET":     secret,
		"JWT_ISSUER":     issuer,
		"JWT_AUDIENCE":   audience,
		"OUTBOX_ENABLED": "false",
	}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort))
	defer eventsSvc.Stop()

	marketSvc := startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
		"PORT":          fmt.Sprintf("%d", marketPort),
		"DATABASE_URL":  testDSN,
		"JWT_SECRET":    secret,
		"JWT_ISSUER":    issuer,
		"JWT_AUDIENCE":  audience,
		"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
	}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort))
	defer marketSvc.Stop()

	bettingSvc := startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
		"PORT":              fmt.Sprintf("%d", bettingPort),
		"DATABASE_URL":      testDSN,
		"JWT_SECRET":        secret,
		"JWT_ISSUER":        issuer,
		"JWT_AUDIENCE":      audience,
		"OUTBOX_ENABLED":    "false",
		"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
		"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
	}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort))
	defer bettingSvc.Stop()

	gatewaySvc := startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
		"PORT":                       fmt.Sprintf("%d", gatewayPort),
		"REDIS_ADDR":                 redisAddr,
		"REDIS_PASSWORD":             redisPassword,
		"JWT_SECRET_KEY":             secret,
		"JWT_ISSUER":                 issuer,
		"JWT_AUDIENCE":               audience,
		"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
		"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
		"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
		"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
		"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
	}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort))
	defer gatewaySvc.Stop()

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	player := registerUser(t, gatewayBase, map[string]any{
		"email":         "bet-wallet-failure-player@example.com",
		"username":      "betwalletfail1",
		"password":      "Password123!",
		"first_name":    "Bet",
		"last_name":     "Failure",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "bet-wallet-failure-admin@example.com",
		"username":      "betwalletadmin1",
		"password":      "Password123!",
		"first_name":    "Admin",
		"last_name":     "Failure",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")

	playerToken := loginUser(t, gatewayBase, "betwalletfail1", "Password123!")
	adminToken := loginUser(t, gatewayBase, "betwalletadmin1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/deposits", playerToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_wallet_failure", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "bet_wallet_failure_evt",
		"sport":             "basketball",
		"league":            "NBA",
		"home_team":         "Heat",
		"away_team":         "Celtics",
		"scheduled_start":   time.Now().UTC().Add(2 * time.Hour).Format(time.RFC3339),
		"venue":             "Arena",
		"country":           "USA",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Heat", "outcome_id": "cccccccc-3333-3333-3333-333333333333"},
			{"name": "Celtics", "outcome_id": "dddddddd-4444-4444-4444-444444444444"},
		},
		"odds": map[string]any{
			"cccccccc-3333-3333-3333-333333333333": 1.88,
			"dddddddd-4444-4444-4444-444444444444": 1.95,
		},
	}, &market, http.StatusCreated)

	walletSvc.Stop()
	walletSvc = nil

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerToken, map[string]any{
		"user_id":    player.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "cccccccc-3333-3333-3333-333333333333",
		"stake":      15.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       1.88,
	}, nil, http.StatusBadRequest)

	if countTableRows(t, ctx, testDSN, "bets") != 0 {
		t.Fatalf("expected no bets persisted after wallet failure")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReserved'") != 0 {
		t.Fatalf("expected no wallet reserve events after wallet failure")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'bet' AND event_type = 'BetPlaced'") != 0 {
		t.Fatalf("expected no bet placed events after wallet failure")
	}
}

func TestComposeCashoutWalletFailureKeepsBetPending(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_cashout_wallet_failure_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
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

	walletSvc := startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
		"PORT":           fmt.Sprintf("%d", walletPort),
		"DATABASE_URL":   testDSN,
		"REDIS_ADDR":     redisAddr,
		"REDIS_PASSWORD": redisPassword,
		"OUTBOX_ENABLED": "false",
		"JWT_SECRET":     secret,
		"JWT_ISSUER":     issuer,
		"JWT_AUDIENCE":   audience,
	}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort))
	defer func() {
		if walletSvc != nil {
			walletSvc.Stop()
		}
	}()

	eventsSvc := startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
		"PORT":           fmt.Sprintf("%d", eventsPort),
		"DATABASE_URL":   testDSN,
		"OUTBOX_ENABLED": "false",
		"JWT_SECRET":     secret,
		"JWT_ISSUER":     issuer,
		"JWT_AUDIENCE":   audience,
	}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort))
	defer eventsSvc.Stop()

	marketSvc := startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
		"PORT":          fmt.Sprintf("%d", marketPort),
		"DATABASE_URL":  testDSN,
		"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
		"JWT_SECRET":    secret,
		"JWT_ISSUER":    issuer,
		"JWT_AUDIENCE":  audience,
	}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort))
	defer marketSvc.Stop()

	bettingSvc := startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
		"PORT":              fmt.Sprintf("%d", bettingPort),
		"DATABASE_URL":      testDSN,
		"OUTBOX_ENABLED":    "false",
		"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
		"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
		"JWT_SECRET":        secret,
		"JWT_ISSUER":        issuer,
		"JWT_AUDIENCE":      audience,
	}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort))
	defer bettingSvc.Stop()

	gatewaySvc := startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
		"PORT":                       fmt.Sprintf("%d", gatewayPort),
		"REDIS_ADDR":                 redisAddr,
		"REDIS_PASSWORD":             redisPassword,
		"JWT_SECRET_KEY":             secret,
		"JWT_ISSUER":                 issuer,
		"JWT_AUDIENCE":               audience,
		"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
		"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
		"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
		"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
		"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
	}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort))
	defer gatewaySvc.Stop()

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	player := registerUser(t, gatewayBase, map[string]any{
		"email":         "cashout-wallet-failure-player@example.com",
		"username":      "cashoutwallet1",
		"password":      "Password123!",
		"first_name":    "Cashout",
		"last_name":     "Failure",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "cashout-wallet-failure-admin@example.com",
		"username":      "cashoutwalletadmin1",
		"password":      "Password123!",
		"first_name":    "Cashout",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")

	playerToken := loginUser(t, gatewayBase, "cashoutwallet1", "Password123!")
	adminToken := loginUser(t, gatewayBase, "cashoutwalletadmin1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/deposits", playerToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_cashout_failure", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "cashout_wallet_failure_evt",
		"sport":             "basketball",
		"league":            "NBA",
		"home_team":         "Lakers",
		"away_team":         "Bulls",
		"scheduled_start":   time.Now().UTC().Add(2 * time.Hour).Format(time.RFC3339),
		"venue":             "Arena",
		"country":           "USA",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Lakers", "outcome_id": "eeeeeeee-5555-5555-5555-555555555555"},
			{"name": "Bulls", "outcome_id": "ffffffff-6666-6666-6666-666666666666"},
		},
		"odds": map[string]any{
			"eeeeeeee-5555-5555-5555-555555555555": 1.88,
			"ffffffff-6666-6666-6666-666666666666": 2.50,
		},
	}, &market, http.StatusCreated)

	var bet placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerToken, map[string]any{
		"user_id":    player.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "eeeeeeee-5555-5555-5555-555555555555",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       1.88,
	}, &bet, http.StatusCreated)

	var offer struct {
		CashoutOffer string `json:"cashout_offer"`
	}
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/bets/"+bet.BetID+"/cashout-offer", playerToken, nil, &offer, http.StatusOK)

	walletSvc.Stop()
	walletSvc = nil

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets/"+bet.BetID+"/cashout", playerToken, map[string]any{
		"cashout_price": offer.CashoutOffer,
	}, nil, http.StatusBadRequest)

	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM bets WHERE id = $1 AND status = 'pending'", bet.BetID) != 1 {
		t.Fatalf("expected bet to remain pending after wallet failure during cashout")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'bet' AND aggregate_id = $1 AND event_type = 'BetCashedOut'", bet.BetID) != 0 {
		t.Fatalf("expected no bet cashout events after wallet-side cashout failure")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased'") != 0 {
		t.Fatalf("expected no wallet release events after wallet-side cashout failure")
	}
}

func TestComposeSettlementRollsBackWhenLaterWalletWriteFails(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_settlement_rollback_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
	settlementPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
			"PORT":           fmt.Sprintf("%d", eventsPort),
			"DATABASE_URL":   testDSN,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
			"PORT":          fmt.Sprintf("%d", marketPort),
			"DATABASE_URL":  testDSN,
			"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
			"JWT_SECRET":    secret,
			"JWT_ISSUER":    issuer,
			"JWT_AUDIENCE":  audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
			"PORT":              fmt.Sprintf("%d", bettingPort),
			"DATABASE_URL":      testDSN,
			"OUTBOX_ENABLED":    "false",
			"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"JWT_SECRET":        secret,
			"JWT_ISSUER":        issuer,
			"JWT_AUDIENCE":      audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-settlement"), map[string]string{
			"PORT":           fmt.Sprintf("%d", settlementPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", settlementPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":                       fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":                 redisAddr,
			"REDIS_PASSWORD":             redisPassword,
			"JWT_SECRET_KEY":             secret,
			"JWT_ISSUER":                 issuer,
			"JWT_AUDIENCE":               audience,
			"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
			"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
			"PHOENIX_SETTLEMENT_URL":     fmt.Sprintf("http://127.0.0.1:%d", settlementPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	playerOne := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-rollback-one@example.com",
		"username":      "settlerb1",
		"password":      "Password123!",
		"first_name":    "Settle",
		"last_name":     "One",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	playerTwo := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-rollback-two@example.com",
		"username":      "settlerb2",
		"password":      "Password123!",
		"first_name":    "Settle",
		"last_name":     "Two",
		"country":       "MT",
		"date_of_birth": "1991-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-rollback-admin@example.com",
		"username":      "settlerbadmin1",
		"password":      "Password123!",
		"first_name":    "Settle",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	operator := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-rollback-operator@example.com",
		"username":      "settlerbop1",
		"password":      "Password123!",
		"first_name":    "Settle",
		"last_name":     "Operator",
		"country":       "MT",
		"date_of_birth": "1987-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")
	setUserRole(t, ctx, testDSN, operator.UserID, "settlement_operator")

	playerOneToken := loginUser(t, gatewayBase, "settlerb1", "Password123!")
	playerTwoToken := loginUser(t, gatewayBase, "settlerb2", "Password123!")
	adminToken := loginUser(t, gatewayBase, "settlerbadmin1", "Password123!")
	operatorToken := loginUser(t, gatewayBase, "settlerbop1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID, playerOneToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID, playerTwoToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID+"/deposits", playerOneToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_rb_1", "currency": "USD"}, nil, http.StatusAccepted)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID+"/deposits", playerTwoToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_rb_2", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "settlement_rollback_evt",
		"sport":             "soccer",
		"league":            "La Liga",
		"home_team":         "Madrid",
		"away_team":         "Valencia",
		"scheduled_start":   time.Now().UTC().Add(90 * time.Minute).Format(time.RFC3339),
		"venue":             "Bernabeu",
		"country":           "Spain",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Madrid", "outcome_id": "11111111-aaaa-bbbb-cccc-000000000001"},
			{"name": "Valencia", "outcome_id": "22222222-aaaa-bbbb-cccc-000000000002"},
		},
		"odds": map[string]any{
			"11111111-aaaa-bbbb-cccc-000000000001": 1.70,
			"22222222-aaaa-bbbb-cccc-000000000002": 2.10,
		},
	}, &market, http.StatusCreated)

	var betOne placedBet
	var betTwo placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerOneToken, map[string]any{
		"user_id":    playerOne.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "11111111-aaaa-bbbb-cccc-000000000001",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       1.70,
	}, &betOne, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerTwoToken, map[string]any{
		"user_id":    playerTwo.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "22222222-aaaa-bbbb-cccc-000000000002",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       2.10,
	}, &betTwo, http.StatusCreated)

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect rollback db: %v", err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `DELETE FROM wallets WHERE user_id = $1`, playerTwo.UserID); err != nil {
		t.Fatalf("delete player two wallet: %v", err)
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/settlement-batches", operatorToken, map[string]any{
		"market_ids": []string{market.MarketID},
		"winning_outcomes": map[string]any{
			market.MarketID: "11111111-aaaa-bbbb-cccc-000000000001",
		},
		"settlement_type": "automatic",
	}, nil, http.StatusNotFound)

	if countTableRows(t, ctx, testDSN, "settlement_batches") != 0 {
		t.Fatalf("expected no settlement batches after transactional rollback")
	}
	if countTableRows(t, ctx, testDSN, "settlement_batch_items") != 0 {
		t.Fatalf("expected no settlement batch items after transactional rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM bets WHERE id IN ($1, $2) AND status = 'pending'", betOne.BetID, betTwo.BetID) != 2 {
		t.Fatalf("expected both bets to remain pending after settlement rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'bet' AND event_type = 'BetSettled'") != 0 {
		t.Fatalf("expected no bet settled events after settlement rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased'") != 0 {
		t.Fatalf("expected no wallet release events after settlement rollback")
	}
}

func TestComposeSettlementRollsBackWhenLaterBetWouldDriveWalletNegative(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_settlement_negative_wallet_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
	settlementPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
			"PORT":           fmt.Sprintf("%d", eventsPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
			"PORT":          fmt.Sprintf("%d", marketPort),
			"DATABASE_URL":  testDSN,
			"JWT_SECRET":    secret,
			"JWT_ISSUER":    issuer,
			"JWT_AUDIENCE":  audience,
			"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
			"PORT":              fmt.Sprintf("%d", bettingPort),
			"DATABASE_URL":      testDSN,
			"JWT_SECRET":        secret,
			"JWT_ISSUER":        issuer,
			"JWT_AUDIENCE":      audience,
			"OUTBOX_ENABLED":    "false",
			"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-settlement"), map[string]string{
			"PORT":           fmt.Sprintf("%d", settlementPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", settlementPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":                       fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":                 redisAddr,
			"REDIS_PASSWORD":             redisPassword,
			"JWT_SECRET_KEY":             secret,
			"JWT_ISSUER":                 issuer,
			"JWT_AUDIENCE":               audience,
			"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
			"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
			"PHOENIX_SETTLEMENT_URL":     fmt.Sprintf("http://127.0.0.1:%d", settlementPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	playerOne := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-negative-one@example.com",
		"username":      "settleneg1",
		"password":      "Password123!",
		"first_name":    "Negative",
		"last_name":     "One",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	playerTwo := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-negative-two@example.com",
		"username":      "settleneg2",
		"password":      "Password123!",
		"first_name":    "Negative",
		"last_name":     "Two",
		"country":       "MT",
		"date_of_birth": "1991-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-negative-admin@example.com",
		"username":      "settlenegadmin1",
		"password":      "Password123!",
		"first_name":    "Negative",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	operator := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-negative-operator@example.com",
		"username":      "settlenegop1",
		"password":      "Password123!",
		"first_name":    "Negative",
		"last_name":     "Operator",
		"country":       "MT",
		"date_of_birth": "1987-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")
	setUserRole(t, ctx, testDSN, operator.UserID, "settlement_operator")

	playerOneToken := loginUser(t, gatewayBase, "settleneg1", "Password123!")
	playerTwoToken := loginUser(t, gatewayBase, "settleneg2", "Password123!")
	adminToken := loginUser(t, gatewayBase, "settlenegadmin1", "Password123!")
	operatorToken := loginUser(t, gatewayBase, "settlenegop1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID, playerOneToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID, playerTwoToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID+"/deposits", playerOneToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_neg_1", "currency": "USD"}, nil, http.StatusAccepted)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID+"/deposits", playerTwoToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_neg_2", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "settlement_negative_wallet_evt",
		"sport":             "soccer",
		"league":            "Bundesliga",
		"home_team":         "Bayern",
		"away_team":         "Dortmund",
		"scheduled_start":   time.Now().UTC().Add(90 * time.Minute).Format(time.RFC3339),
		"venue":             "Allianz Arena",
		"country":           "Germany",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Bayern", "outcome_id": "55555555-aaaa-bbbb-cccc-000000000005"},
			{"name": "Dortmund", "outcome_id": "66666666-aaaa-bbbb-cccc-000000000006"},
		},
		"odds": map[string]any{
			"55555555-aaaa-bbbb-cccc-000000000005": 1.55,
			"66666666-aaaa-bbbb-cccc-000000000006": 2.55,
		},
	}, &market, http.StatusCreated)

	var betOne placedBet
	var betTwo placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerOneToken, map[string]any{
		"user_id":    playerOne.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "55555555-aaaa-bbbb-cccc-000000000005",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       1.55,
	}, &betOne, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerTwoToken, map[string]any{
		"user_id":    playerTwo.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "66666666-aaaa-bbbb-cccc-000000000006",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       2.55,
	}, &betTwo, http.StatusCreated)

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect negative wallet db: %v", err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `UPDATE wallets SET balance = 0, updated_at = NOW() WHERE user_id = $1`, playerTwo.UserID); err != nil {
		t.Fatalf("zero player two wallet balance: %v", err)
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/settlement-batches", operatorToken, map[string]any{
		"market_ids": []string{market.MarketID},
		"winning_outcomes": map[string]any{
			market.MarketID: "55555555-aaaa-bbbb-cccc-000000000005",
		},
		"settlement_type": "automatic",
	}, nil, http.StatusBadRequest)

	if countTableRows(t, ctx, testDSN, "settlement_batches") != 0 {
		t.Fatalf("expected no settlement batches after negative-balance rollback")
	}
	if countTableRows(t, ctx, testDSN, "settlement_batch_items") != 0 {
		t.Fatalf("expected no settlement batch items after negative-balance rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM bets WHERE id IN ($1, $2) AND status = 'pending'", betOne.BetID, betTwo.BetID) != 2 {
		t.Fatalf("expected both bets to remain pending after negative-balance rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'bet' AND event_type = 'BetSettled'") != 0 {
		t.Fatalf("expected no bet settled events after negative-balance rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased'") != 0 {
		t.Fatalf("expected no wallet release events after negative-balance rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM wallet_transactions WHERE type IN ('bet_win', 'bet_place')") != 0 {
		t.Fatalf("expected no settlement wallet transactions after negative-balance rollback")
	}
}

func TestComposeSettlementRollsBackWhenLaterBetReservationIsInvalid(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_settlement_bad_reservation_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
	settlementPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
			"PORT":           fmt.Sprintf("%d", eventsPort),
			"DATABASE_URL":   testDSN,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
			"PORT":          fmt.Sprintf("%d", marketPort),
			"DATABASE_URL":  testDSN,
			"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
			"JWT_SECRET":    secret,
			"JWT_ISSUER":    issuer,
			"JWT_AUDIENCE":  audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
			"PORT":              fmt.Sprintf("%d", bettingPort),
			"DATABASE_URL":      testDSN,
			"OUTBOX_ENABLED":    "false",
			"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"JWT_SECRET":        secret,
			"JWT_ISSUER":        issuer,
			"JWT_AUDIENCE":      audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-settlement"), map[string]string{
			"PORT":           fmt.Sprintf("%d", settlementPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", settlementPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":                       fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":                 redisAddr,
			"REDIS_PASSWORD":             redisPassword,
			"JWT_SECRET_KEY":             secret,
			"JWT_ISSUER":                 issuer,
			"JWT_AUDIENCE":               audience,
			"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
			"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
			"PHOENIX_SETTLEMENT_URL":     fmt.Sprintf("http://127.0.0.1:%d", settlementPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	playerOne := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-badres-one@example.com",
		"username":      "settlebadres1",
		"password":      "Password123!",
		"first_name":    "Reservation",
		"last_name":     "One",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	playerTwo := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-badres-two@example.com",
		"username":      "settlebadres2",
		"password":      "Password123!",
		"first_name":    "Reservation",
		"last_name":     "Two",
		"country":       "MT",
		"date_of_birth": "1991-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-badres-admin@example.com",
		"username":      "settlebadresadmin1",
		"password":      "Password123!",
		"first_name":    "Reservation",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	operator := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-badres-operator@example.com",
		"username":      "settlebadresop1",
		"password":      "Password123!",
		"first_name":    "Reservation",
		"last_name":     "Operator",
		"country":       "MT",
		"date_of_birth": "1987-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")
	setUserRole(t, ctx, testDSN, operator.UserID, "settlement_operator")

	playerOneToken := loginUser(t, gatewayBase, "settlebadres1", "Password123!")
	playerTwoToken := loginUser(t, gatewayBase, "settlebadres2", "Password123!")
	adminToken := loginUser(t, gatewayBase, "settlebadresadmin1", "Password123!")
	operatorToken := loginUser(t, gatewayBase, "settlebadresop1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID, playerOneToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID, playerTwoToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID+"/deposits", playerOneToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_badres_1", "currency": "USD"}, nil, http.StatusAccepted)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID+"/deposits", playerTwoToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_badres_2", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "settlement_invalid_reservation_evt",
		"sport":             "soccer",
		"league":            "Eredivisie",
		"home_team":         "Ajax",
		"away_team":         "PSV",
		"scheduled_start":   time.Now().UTC().Add(90 * time.Minute).Format(time.RFC3339),
		"venue":             "Johan Cruyff Arena",
		"country":           "Netherlands",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Ajax", "outcome_id": "77777777-aaaa-bbbb-cccc-000000000007"},
			{"name": "PSV", "outcome_id": "88888888-aaaa-bbbb-cccc-000000000008"},
		},
		"odds": map[string]any{
			"77777777-aaaa-bbbb-cccc-000000000007": 1.80,
			"88888888-aaaa-bbbb-cccc-000000000008": 2.10,
		},
	}, &market, http.StatusCreated)

	var betOne placedBet
	var betTwo placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerOneToken, map[string]any{
		"user_id":    playerOne.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "77777777-aaaa-bbbb-cccc-000000000007",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       1.80,
	}, &betOne, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerTwoToken, map[string]any{
		"user_id":    playerTwo.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "88888888-aaaa-bbbb-cccc-000000000008",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       2.10,
	}, &betTwo, http.StatusCreated)

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect invalid reservation db: %v", err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `
		UPDATE event_store
		SET payload = jsonb_set(payload, '{reservation_id}', to_jsonb($2::text), true)
		WHERE aggregate_type = 'bet' AND aggregate_id = $1 AND event_type = 'BetPlaced'
	`, betTwo.BetID, "99999999-aaaa-bbbb-cccc-000000000009"); err != nil {
		t.Fatalf("corrupt second bet reservation id: %v", err)
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/settlement-batches", operatorToken, map[string]any{
		"market_ids": []string{market.MarketID},
		"winning_outcomes": map[string]any{
			market.MarketID: "77777777-aaaa-bbbb-cccc-000000000007",
		},
		"settlement_type": "automatic",
	}, nil, http.StatusBadRequest)

	if countTableRows(t, ctx, testDSN, "settlement_batches") != 0 {
		t.Fatalf("expected no settlement batches after invalid-reservation rollback")
	}
	if countTableRows(t, ctx, testDSN, "settlement_batch_items") != 0 {
		t.Fatalf("expected no settlement batch items after invalid-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM bets WHERE id IN ($1, $2) AND status = 'pending'", betOne.BetID, betTwo.BetID) != 2 {
		t.Fatalf("expected both bets to remain pending after invalid-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'bet' AND event_type = 'BetSettled'") != 0 {
		t.Fatalf("expected no bet settled events after invalid-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased'") != 0 {
		t.Fatalf("expected no wallet release events after invalid-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM wallet_transactions WHERE type IN ('bet_win', 'bet_place')") != 0 {
		t.Fatalf("expected no settlement wallet transactions after invalid-reservation rollback")
	}
}

func TestComposeSettlementRollsBackWhenLaterBetReservationIsPartiallyReleased(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_settlement_partial_reservation_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
	settlementPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
			"PORT":           fmt.Sprintf("%d", eventsPort),
			"DATABASE_URL":   testDSN,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
			"PORT":          fmt.Sprintf("%d", marketPort),
			"DATABASE_URL":  testDSN,
			"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
			"JWT_SECRET":    secret,
			"JWT_ISSUER":    issuer,
			"JWT_AUDIENCE":  audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
			"PORT":              fmt.Sprintf("%d", bettingPort),
			"DATABASE_URL":      testDSN,
			"OUTBOX_ENABLED":    "false",
			"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"JWT_SECRET":        secret,
			"JWT_ISSUER":        issuer,
			"JWT_AUDIENCE":      audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-settlement"), map[string]string{
			"PORT":           fmt.Sprintf("%d", settlementPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", settlementPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":                       fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":                 redisAddr,
			"REDIS_PASSWORD":             redisPassword,
			"JWT_SECRET_KEY":             secret,
			"JWT_ISSUER":                 issuer,
			"JWT_AUDIENCE":               audience,
			"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
			"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
			"PHOENIX_SETTLEMENT_URL":     fmt.Sprintf("http://127.0.0.1:%d", settlementPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	playerOne := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-partialres-one@example.com",
		"username":      "settlepartial1",
		"password":      "Password123!",
		"first_name":    "Partial",
		"last_name":     "One",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	playerTwo := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-partialres-two@example.com",
		"username":      "settlepartial2",
		"password":      "Password123!",
		"first_name":    "Partial",
		"last_name":     "Two",
		"country":       "MT",
		"date_of_birth": "1991-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-partialres-admin@example.com",
		"username":      "settlepartialadmin1",
		"password":      "Password123!",
		"first_name":    "Partial",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	operator := registerUser(t, gatewayBase, map[string]any{
		"email":         "settle-partialres-operator@example.com",
		"username":      "settlepartialop1",
		"password":      "Password123!",
		"first_name":    "Partial",
		"last_name":     "Operator",
		"country":       "MT",
		"date_of_birth": "1987-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")
	setUserRole(t, ctx, testDSN, operator.UserID, "settlement_operator")

	playerOneToken := loginUser(t, gatewayBase, "settlepartial1", "Password123!")
	playerTwoToken := loginUser(t, gatewayBase, "settlepartial2", "Password123!")
	adminToken := loginUser(t, gatewayBase, "settlepartialadmin1", "Password123!")
	operatorToken := loginUser(t, gatewayBase, "settlepartialop1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID, playerOneToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID, playerTwoToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerOne.UserID+"/deposits", playerOneToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_partial_1", "currency": "USD"}, nil, http.StatusAccepted)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID+"/deposits", playerTwoToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_settle_partial_2", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "settlement_partial_release_evt",
		"sport":             "soccer",
		"league":            "Primeira Liga",
		"home_team":         "Benfica",
		"away_team":         "Porto",
		"scheduled_start":   time.Now().UTC().Add(90 * time.Minute).Format(time.RFC3339),
		"venue":             "Estadio da Luz",
		"country":           "Portugal",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Benfica", "outcome_id": "99999999-aaaa-bbbb-cccc-000000000010"},
			{"name": "Porto", "outcome_id": "99999999-aaaa-bbbb-cccc-000000000011"},
		},
		"odds": map[string]any{
			"99999999-aaaa-bbbb-cccc-000000000010": 1.70,
			"99999999-aaaa-bbbb-cccc-000000000011": 2.25,
		},
	}, &market, http.StatusCreated)

	var betOne placedBet
	var betTwo placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerOneToken, map[string]any{
		"user_id":    playerOne.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "99999999-aaaa-bbbb-cccc-000000000010",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       1.70,
	}, &betOne, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerTwoToken, map[string]any{
		"user_id":    playerTwo.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "99999999-aaaa-bbbb-cccc-000000000011",
		"stake":      20.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       2.25,
	}, &betTwo, http.StatusCreated)

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect partial reservation db: %v", err)
	}
	defer pool.Close()

	var playerTwoReservationID string
	if err := pool.QueryRow(ctx, `
		SELECT payload->>'reservation_id'
		FROM event_store
		WHERE aggregate_type = 'bet' AND aggregate_id = $1 AND event_type = 'BetPlaced'
		ORDER BY version DESC
		LIMIT 1
	`, betTwo.BetID).Scan(&playerTwoReservationID); err != nil {
		t.Fatalf("load player two reservation id: %v", err)
	}
	if playerTwoReservationID == "" {
		t.Fatalf("expected reservation id for player two bet")
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+playerTwo.UserID+"/release-reserve", playerTwoToken, map[string]any{
		"reservation_id": playerTwoReservationID,
		"amount":         10.00,
	}, nil, http.StatusCreated)

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/settlement-batches", operatorToken, map[string]any{
		"market_ids": []string{market.MarketID},
		"winning_outcomes": map[string]any{
			market.MarketID: "99999999-aaaa-bbbb-cccc-000000000010",
		},
		"settlement_type": "automatic",
	}, nil, http.StatusBadRequest)

	if countTableRows(t, ctx, testDSN, "settlement_batches") != 0 {
		t.Fatalf("expected no settlement batches after partial-reservation rollback")
	}
	if countTableRows(t, ctx, testDSN, "settlement_batch_items") != 0 {
		t.Fatalf("expected no settlement batch items after partial-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM bets WHERE id IN ($1, $2) AND status = 'pending'", betOne.BetID, betTwo.BetID) != 2 {
		t.Fatalf("expected both bets to remain pending after partial-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'bet' AND event_type = 'BetSettled'") != 0 {
		t.Fatalf("expected no bet settled events after partial-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased' AND payload->>'result' IN ('won', 'lost', 'voided')") != 0 {
		t.Fatalf("expected no settlement wallet release events after partial-reservation rollback")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM wallet_transactions WHERE type IN ('bet_win', 'bet_place')") != 0 {
		t.Fatalf("expected no settlement wallet transactions after partial-reservation rollback")
	}
}

func TestComposeWithdrawalBlockedByReservedFundsLeavesWalletUntouched(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_withdraw_reserved_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	eventsPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
			"PORT":           fmt.Sprintf("%d", eventsPort),
			"DATABASE_URL":   testDSN,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
			"PORT":          fmt.Sprintf("%d", marketPort),
			"DATABASE_URL":  testDSN,
			"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
			"JWT_SECRET":    secret,
			"JWT_ISSUER":    issuer,
			"JWT_AUDIENCE":  audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-betting-engine"), map[string]string{
			"PORT":              fmt.Sprintf("%d", bettingPort),
			"DATABASE_URL":      testDSN,
			"OUTBOX_ENABLED":    "false",
			"WALLET_URL":        fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"MARKET_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"JWT_SECRET":        secret,
			"JWT_ISSUER":        issuer,
			"JWT_AUDIENCE":      audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", bettingPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":                       fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":                 redisAddr,
			"REDIS_PASSWORD":             redisPassword,
			"JWT_SECRET_KEY":             secret,
			"JWT_ISSUER":                 issuer,
			"JWT_AUDIENCE":               audience,
			"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
			"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	player := registerUser(t, gatewayBase, map[string]any{
		"email":         "withdraw-reserved-player@example.com",
		"username":      "withres1",
		"password":      "Password123!",
		"first_name":    "Withdraw",
		"last_name":     "Reserved",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "withdraw-reserved-admin@example.com",
		"username":      "withresadmin1",
		"password":      "Password123!",
		"first_name":    "Withdraw",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")

	playerToken := loginUser(t, gatewayBase, "withres1", "Password123!")
	adminToken := loginUser(t, gatewayBase, "withresadmin1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/deposits", playerToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_withdraw_reserved", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "withdraw_reserved_evt",
		"sport":             "tennis",
		"league":            "ATP",
		"home_team":         "Player A",
		"away_team":         "Player B",
		"scheduled_start":   time.Now().UTC().Add(90 * time.Minute).Format(time.RFC3339),
		"venue":             "Center Court",
		"country":           "Spain",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Player A", "outcome_id": "33333333-aaaa-bbbb-cccc-000000000003"},
			{"name": "Player B", "outcome_id": "44444444-aaaa-bbbb-cccc-000000000004"},
		},
		"odds": map[string]any{
			"33333333-aaaa-bbbb-cccc-000000000003": 1.91,
			"44444444-aaaa-bbbb-cccc-000000000004": 1.91,
		},
	}, &market, http.StatusCreated)

	var bet placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerToken, map[string]any{
		"user_id":    player.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "33333333-aaaa-bbbb-cccc-000000000003",
		"stake":      30.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       1.91,
	}, &bet, http.StatusCreated)

	var summary struct {
		Balance   string `json:"balance"`
		Reserved  string `json:"reserved"`
		Available string `json:"available"`
	}
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, nil, &summary, http.StatusOK)
	if summary.Reserved != "30" || summary.Available != "70" {
		t.Fatalf("expected reserved wallet state before withdrawal, got %+v", summary)
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/withdrawals", playerToken, map[string]any{
		"amount":          80.00,
		"bank_account_id": "bank_reserved_fail",
		"currency":        "USD",
	}, nil, http.StatusBadRequest)

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, nil, &summary, http.StatusOK)
	if summary.Balance != "100" || summary.Reserved != "30" || summary.Available != "70" {
		t.Fatalf("expected wallet summary unchanged after blocked withdrawal, got %+v", summary)
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM wallet_transactions WHERE type = 'withdrawal'") != 0 {
		t.Fatalf("expected no withdrawal transaction persisted when reserved funds block withdrawal")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletWithdrawalCreated'") != 0 {
		t.Fatalf("expected no withdrawal event persisted when reserved funds block withdrawal")
	}
	_ = bet
}

func TestComposeWalletGuardrailFailuresDoNotPersistState(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_wallet_guardrails_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	redisAddr := getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379")
	redisPassword := getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", "")
	flushRedis(t, ctx, redisAddr, redisPassword)

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     redisAddr,
			"REDIS_PASSWORD": redisPassword,
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":               fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":         redisAddr,
			"REDIS_PASSWORD":     redisPassword,
			"JWT_SECRET_KEY":     secret,
			"JWT_ISSUER":         issuer,
			"JWT_AUDIENCE":       audience,
			"PHOENIX_USER_URL":   fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL": fmt.Sprintf("http://127.0.0.1:%d", walletPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	player := registerUser(t, gatewayBase, map[string]any{
		"email":         "wallet-guard-player@example.com",
		"username":      "walletguardplayer1",
		"password":      "Password123!",
		"first_name":    "Wallet",
		"last_name":     "Guard",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "wallet-guard-admin@example.com",
		"username":      "walletguardadmin1",
		"password":      "Password123!",
		"first_name":    "Wallet",
		"last_name":     "Admin",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")

	playerToken := loginUser(t, gatewayBase, "walletguardplayer1", "Password123!")
	adminToken := loginUser(t, gatewayBase, "walletguardadmin1", "Password123!")

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/deposits", playerToken, map[string]any{
		"amount":         100.00,
		"payment_method": "card",
		"payment_token":  "tok_wallet_guardrails",
		"currency":       "USD",
	}, nil, http.StatusAccepted)

	missingUserID := "00000000-0000-0000-0000-000000000444"
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+missingUserID+"/deposits", adminToken, map[string]any{
		"amount":         25.00,
		"payment_method": "card",
		"payment_token":  "tok_missing_wallet_user",
		"currency":       "USD",
	}, nil, http.StatusNotFound)

	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM wallets WHERE user_id = $1", missingUserID) != 0 {
		t.Fatalf("expected no wallet row for missing user deposit")
	}
	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = $1", missingUserID) != 0 {
		t.Fatalf("expected no wallet transactions for missing user deposit")
	}

	var reserveResponse struct {
		ReservationID string `json:"reservation_id"`
	}
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/reserve", playerToken, map[string]any{
		"amount":         20.00,
		"reference_id":   "wallet-guardrails-reserve",
		"reference_type": "bet",
	}, &reserveResponse, http.StatusCreated)
	if reserveResponse.ReservationID == "" {
		t.Fatalf("expected reservation id")
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/reserve", playerToken, map[string]any{
		"amount":         90.00,
		"reference_id":   "wallet-guardrails-reserve-too-much",
		"reference_type": "bet",
	}, nil, http.StatusBadRequest)

	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReserved'") != 1 {
		t.Fatalf("expected no extra reserve event when reserve amount exceeds available balance")
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/release-reserve", playerToken, map[string]any{
		"reservation_id": reserveResponse.ReservationID,
		"amount":         30.00,
	}, nil, http.StatusBadRequest)

	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased'") != 0 {
		t.Fatalf("expected no release event when release amount exceeds reserved amount")
	}

	var summary struct {
		Reserved  string `json:"reserved"`
		Available string `json:"available"`
	}
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, nil, &summary, http.StatusOK)
	if summary.Reserved != "20" && summary.Reserved != "20.00" {
		t.Fatalf("expected reservation to remain intact after invalid release, got %+v", summary)
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/release-reserve", playerToken, map[string]any{
		"reservation_id": reserveResponse.ReservationID,
		"amount":         20.00,
	}, nil, http.StatusCreated)

	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased'") != 1 {
		t.Fatalf("expected exactly one release event after valid full release")
	}

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, nil, &summary, http.StatusOK)
	if summary.Reserved != "0" && summary.Reserved != "0.00" {
		t.Fatalf("expected reservation to be cleared after full release, got %+v", summary)
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/release-reserve", playerToken, map[string]any{
		"reservation_id": reserveResponse.ReservationID,
		"amount":         1.00,
	}, nil, http.StatusBadRequest)

	if countQueryRows(t, ctx, testDSN, "SELECT COUNT(*) FROM event_store WHERE aggregate_type = 'wallet' AND event_type = 'WalletFundsReleased'") != 1 {
		t.Fatalf("expected no duplicate release event after releasing an exhausted reservation")
	}
}

func countTableRows(t *testing.T, ctx context.Context, dsn, table string) int {
	t.Helper()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect count db: %v", err)
	}
	defer pool.Close()

	var count int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM "+quoteIdentifier(table)).Scan(&count); err != nil {
		t.Fatalf("count rows in %s: %v", table, err)
	}
	return count
}

func countQueryRows(t *testing.T, ctx context.Context, dsn, query string, args ...any) int {
	t.Helper()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect count db: %v", err)
	}
	defer pool.Close()

	var count int
	if err := pool.QueryRow(ctx, query, args...).Scan(&count); err != nil {
		t.Fatalf("count query rows: %v", err)
	}
	return count
}
