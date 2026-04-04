package integration_test

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type registeredUser struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

type loginResponse struct {
	AccessToken string `json:"access_token"`
	User        struct {
		UserID string `json:"user_id"`
	} `json:"user"`
}

type createdEvent struct {
	EventID string `json:"event_id"`
}

type createdMarket struct {
	MarketID string `json:"market_id"`
	Outcomes []struct {
		OutcomeID string `json:"outcome_id"`
		Name      string `json:"name"`
	} `json:"outcomes"`
}

type placedBet struct {
	BetID string `json:"bet_id"`
}

type listedBets struct {
	Data []placedBet `json:"data"`
}

type userProfile struct {
	UserID        string `json:"user_id"`
	FollowerCount int    `json:"follower_count"`
	Stats         struct {
		TotalBets int `json:"total_bets"`
	} `json:"stats"`
}

type socialFollowers struct {
	Data []struct {
		UserID string `json:"user_id"`
	} `json:"data"`
}

type socialFeed struct {
	Data []struct {
		ActivityType string `json:"activity_type"`
		Details      struct {
			BetID string `json:"bet_id"`
		} `json:"details"`
	} `json:"data"`
}

type socialMessage struct {
	MessageID string `json:"message_id"`
	ToUserID  string `json:"to_user_id"`
}

type socialConversation struct {
	ConversationID string `json:"conversation_id"`
	WithUserID     string `json:"with_user_id"`
	Messages       []struct {
		MessageID string `json:"message_id"`
	} `json:"messages"`
}

type complianceLimit struct {
	UserID    string `json:"user_id"`
	LimitID   string `json:"limit_id"`
	LimitType string `json:"limit_type"`
}

type complianceLimitsResponse struct {
	UserID string `json:"user_id"`
	Limits []struct {
		LimitType string `json:"limit_type"`
	} `json:"limits"`
}

type selfExclusion struct {
	UserID      string `json:"user_id"`
	ExclusionID string `json:"exclusion_id"`
	Status      string `json:"status"`
}

type restrictionsResponse struct {
	UserID       string `json:"user_id"`
	Restrictions []struct {
		Type string `json:"type"`
	} `json:"restrictions"`
}

type amlCheckResponse struct {
	CheckID string `json:"check_id"`
	UserID  string `json:"user_id"`
	Status  string `json:"status"`
}

type complianceAlert struct {
	AlertID string `json:"alert_id"`
	Status  string `json:"status"`
}

type trackedAnalyticsEvent struct {
	EventID string `json:"event_id"`
	Status  string `json:"status"`
}

type analyticsUserReport struct {
	UserID string `json:"user_id"`
	Stats  struct {
		TotalBets  int    `json:"total_bets"`
		TotalStake string `json:"total_stake"`
	} `json:"stats"`
}

type analyticsPlatformDashboard struct {
	Date    string `json:"date"`
	Metrics struct {
		ActiveUsers int `json:"active_users"`
		NewUsers    int `json:"new_users"`
		TotalBets   int `json:"total_bets"`
	} `json:"metrics"`
}

type analyticsMarketReport struct {
	Data []struct {
		MarketID  string `json:"market_id"`
		TotalBets int    `json:"total_bets"`
	} `json:"data"`
}

type analyticsCohorts struct {
	Cohorts []struct {
		CohortID   string `json:"cohort_id"`
		UsersCount int    `json:"users_count"`
	} `json:"cohorts"`
}

type notificationPreferencesResponse struct {
	UserID      string `json:"user_id"`
	Preferences struct {
		MarketingEmails   bool `json:"marketing_emails"`
		BetNotifications  bool `json:"bet_notifications"`
		PromotionalSMS    bool `json:"promotional_sms"`
		PushNotifications bool `json:"push_notifications"`
		QuietHours        struct {
			Enabled bool   `json:"enabled"`
			Start   string `json:"start"`
			End     string `json:"end"`
		} `json:"quiet_hours"`
	} `json:"preferences"`
}

type notificationPreferencesUpdateResponse struct {
	UserID string `json:"user_id"`
}

type notificationTemplates struct {
	Data []struct {
		TemplateID string `json:"template_id"`
	} `json:"data"`
}

type queuedNotification struct {
	NotificationID string `json:"notification_id"`
	UserID         string `json:"user_id"`
	Status         string `json:"status"`
}

type notificationStatusUpdate struct {
	NotificationID  string            `json:"notification_id"`
	ChannelStatuses map[string]string `json:"channel_statuses"`
}

type notificationDetail struct {
	NotificationID   string            `json:"notification_id"`
	UserID           string            `json:"user_id"`
	NotificationType string            `json:"notification_type"`
	Status           string            `json:"status"`
	ChannelStatuses  map[string]string `json:"channel_statuses"`
}

type cmsPage struct {
	PageID    string `json:"page_id"`
	Title     string `json:"title"`
	Slug      string `json:"slug"`
	Content   string `json:"content"`
	MetaTitle string `json:"meta_title"`
}

type cmsPages struct {
	Data []cmsPage `json:"data"`
}

type cmsPromotion struct {
	PromotionID   string `json:"promotion_id"`
	Name          string `json:"name"`
	PromotionType string `json:"promotion_type"`
	Status        string `json:"status"`
}

type cmsPromotions struct {
	Data []cmsPromotion `json:"data"`
}

type cmsBanner struct {
	BannerID string `json:"banner_id"`
	Title    string `json:"title"`
	ImageURL string `json:"image_url"`
	Link     string `json:"link"`
}

type cmsBanners struct {
	Data []cmsBanner `json:"data"`
}

type engagementAchievement struct {
	EventType     string `json:"event_type"`
	AchievementID string `json:"achievement_id"`
	UserID        string `json:"user_id"`
	RewardPoints  int    `json:"reward_points"`
}

type engagementPoints struct {
	UserID        string `json:"user_id"`
	PointsAwarded int    `json:"points_awarded"`
	CalculationID string `json:"calculation_id"`
}

type engagementAggregation struct {
	AggregationID string `json:"aggregation_id"`
	UserID        string `json:"user_id"`
	Status        string `json:"status"`
}

type engagementScore struct {
	UserID          string         `json:"user_id"`
	EngagementScore int            `json:"engagement_score"`
	Components      map[string]int `json:"components"`
}

type settlementBatch struct {
	BatchID      string  `json:"batch_id"`
	Status       string  `json:"status"`
	MarketCount  int     `json:"market_count"`
	BetCount     int     `json:"bet_count"`
	SettledCount int     `json:"settled_count"`
	PendingCount int     `json:"pending_count"`
	TotalPayout  string  `json:"total_payout"`
}

type settlementBatchList struct {
	Data []settlementBatch `json:"data"`
}

type manualPayout struct {
	PayoutID string `json:"payout_id"`
	UserID   string `json:"user_id"`
	Amount   string `json:"amount"`
	Status   string `json:"status"`
}

type reconciliationResponse struct {
	ReconciliationID   string `json:"reconciliation_id"`
	BatchID            string `json:"batch_id"`
	Status             string `json:"status"`
	DiscrepanciesFound int    `json:"discrepancies_found"`
}

type walletSummary struct {
	UserID    string `json:"user_id"`
	Balance   string `json:"balance"`
	Reserved  string `json:"reserved"`
	Available string `json:"available"`
}

type walletTransactionList struct {
	Data []struct {
		TransactionID string  `json:"transaction_id"`
		Type          string  `json:"type"`
		Amount        string  `json:"amount"`
		Reference     string  `json:"reference"`
	} `json:"data"`
}

func TestComposeGatewayUserWalletBettingFlow(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	root := codexPrepRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_integration_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))
	flushRedis(t, ctx, getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379"), getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", ""))

	secret := "integration-secret"
	issuer := "phoenix-user"
	audience := "phoenix-platform"

	userPort := freePort(t)
	walletPort := freePort(t)
	marketPort := freePort(t)
	bettingPort := freePort(t)
	eventsPort := freePort(t)
	socialPort := freePort(t)
	compliancePort := freePort(t)
	analyticsPort := freePort(t)
	notificationPort := freePort(t)
	settlementPort := freePort(t)
	cmsPort := freePort(t)
	engagementPort := freePort(t)
	gatewayPort := freePort(t)

	services := []*serviceProcess{
		startService(t, ctx, filepath.Join(root, "phoenix-user"), map[string]string{
			"PORT":           fmt.Sprintf("%d", userPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379"),
			"REDIS_PASSWORD": getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", ""),
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", userPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-wallet"), map[string]string{
			"PORT":           fmt.Sprintf("%d", walletPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379"),
			"REDIS_PASSWORD": getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", ""),
			"OUTBOX_ENABLED": "false",
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
		}, fmt.Sprintf("http://127.0.0.1:%d/health", walletPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-market-engine"), map[string]string{
			"PORT":          fmt.Sprintf("%d", marketPort),
			"DATABASE_URL":  testDSN,
			"JWT_SECRET":    secret,
			"JWT_ISSUER":    issuer,
			"JWT_AUDIENCE":  audience,
			"KAFKA_BROKERS": getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", marketPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-events"), map[string]string{
			"PORT":           fmt.Sprintf("%d", eventsPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", eventsPort)),
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
		startService(t, ctx, filepath.Join(root, "phoenix-social"), map[string]string{
			"PORT":           fmt.Sprintf("%d", socialPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", socialPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-compliance"), map[string]string{
			"PORT":           fmt.Sprintf("%d", compliancePort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", compliancePort)),
		startService(t, ctx, filepath.Join(root, "phoenix-analytics"), map[string]string{
			"PORT":           fmt.Sprintf("%d", analyticsPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", analyticsPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-notification"), map[string]string{
			"PORT":           fmt.Sprintf("%d", notificationPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", notificationPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-settlement"), map[string]string{
			"PORT":           fmt.Sprintf("%d", settlementPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", settlementPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-cms"), map[string]string{
			"PORT":           fmt.Sprintf("%d", cmsPort),
			"DATABASE_URL":   testDSN,
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", cmsPort)),
		startService(t, ctx, filepath.Join(root, "stella-engagement"), map[string]string{
			"PORT":           fmt.Sprintf("%d", engagementPort),
			"DATABASE_URL":   testDSN,
			"REDIS_ADDR":     getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379"),
			"REDIS_PASSWORD": getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", ""),
			"JWT_SECRET":     secret,
			"JWT_ISSUER":     issuer,
			"JWT_AUDIENCE":   audience,
			"OUTBOX_ENABLED": "false",
		}, fmt.Sprintf("http://127.0.0.1:%d/health", engagementPort)),
		startService(t, ctx, filepath.Join(root, "phoenix-gateway"), map[string]string{
			"PORT":                       fmt.Sprintf("%d", gatewayPort),
			"REDIS_ADDR":                 getenv("PHOENIX_INTEGRATION_REDIS_ADDR", "localhost:6379"),
			"REDIS_PASSWORD":             getenv("PHOENIX_INTEGRATION_REDIS_PASSWORD", ""),
			"JWT_SECRET_KEY":             secret,
			"JWT_ISSUER":                 issuer,
			"JWT_AUDIENCE":               audience,
			"PHOENIX_USER_URL":           fmt.Sprintf("http://127.0.0.1:%d", userPort),
			"PHOENIX_WALLET_URL":         fmt.Sprintf("http://127.0.0.1:%d", walletPort),
			"PHOENIX_MARKET_ENGINE_URL":  fmt.Sprintf("http://127.0.0.1:%d", marketPort),
			"PHOENIX_BETTING_ENGINE_URL": fmt.Sprintf("http://127.0.0.1:%d", bettingPort),
			"PHOENIX_EVENTS_URL":         fmt.Sprintf("http://127.0.0.1:%d", eventsPort),
			"PHOENIX_SOCIAL_URL":         fmt.Sprintf("http://127.0.0.1:%d", socialPort),
			"PHOENIX_COMPLIANCE_URL":     fmt.Sprintf("http://127.0.0.1:%d", compliancePort),
			"PHOENIX_ANALYTICS_URL":      fmt.Sprintf("http://127.0.0.1:%d", analyticsPort),
			"PHOENIX_NOTIFICATION_URL":   fmt.Sprintf("http://127.0.0.1:%d", notificationPort),
			"PHOENIX_SETTLEMENT_URL":     fmt.Sprintf("http://127.0.0.1:%d", settlementPort),
			"PHOENIX_CMS_URL":            fmt.Sprintf("http://127.0.0.1:%d", cmsPort),
			"STELLA_ENGAGEMENT_URL":      fmt.Sprintf("http://127.0.0.1:%d", engagementPort),
		}, fmt.Sprintf("http://127.0.0.1:%d/health", gatewayPort)),
	}
	for _, svc := range services {
		defer svc.Stop()
	}

	gatewayBase := fmt.Sprintf("http://127.0.0.1:%d", gatewayPort)
	player := registerUser(t, gatewayBase, map[string]any{
		"email":         "player@example.com",
		"username":      "player1",
		"password":      "Password123!",
		"first_name":    "Player",
		"last_name":     "One",
		"country":       "MT",
		"date_of_birth": "1990-01-01",
	})
	admin := registerUser(t, gatewayBase, map[string]any{
		"email":         "admin@example.com",
		"username":      "admin1",
		"password":      "Password123!",
		"first_name":    "Admin",
		"last_name":     "One",
		"country":       "MT",
		"date_of_birth": "1985-01-01",
	})
	operator := registerUser(t, gatewayBase, map[string]any{
		"email":         "operator@example.com",
		"username":      "operator1",
		"password":      "Password123!",
		"first_name":    "Op",
		"last_name":     "Erator",
		"country":       "MT",
		"date_of_birth": "1988-01-01",
	})
	systemUser := registerUser(t, gatewayBase, map[string]any{
		"email":         "system@example.com",
		"username":      "system1",
		"password":      "Password123!",
		"first_name":    "Sys",
		"last_name":     "Tem",
		"country":       "MT",
		"date_of_birth": "1980-01-01",
	})
	analyst := registerUser(t, gatewayBase, map[string]any{
		"email":         "analyst@example.com",
		"username":      "analyst1",
		"password":      "Password123!",
		"first_name":    "Ana",
		"last_name":     "Lyst",
		"country":       "MT",
		"date_of_birth": "1987-01-01",
	})
	setUserRole(t, ctx, testDSN, admin.UserID, "admin")
	setUserRole(t, ctx, testDSN, operator.UserID, "operator")
	setUserRole(t, ctx, testDSN, systemUser.UserID, "system")
	setUserRole(t, ctx, testDSN, analyst.UserID, "analyst")

	playerToken := loginUser(t, gatewayBase, "player1", "Password123!")
	adminToken := loginUser(t, gatewayBase, "admin1", "Password123!")
	operatorToken := loginUser(t, gatewayBase, "operator1", "Password123!")
	systemToken := loginUser(t, gatewayBase, "system1", "Password123!")
	analystToken := loginUser(t, gatewayBase, "analyst1", "Password123!")
	analyticsBase := fmt.Sprintf("http://127.0.0.1:%d", analyticsPort)

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, map[string]any{"currency": "USD"}, nil, http.StatusCreated)
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/wallets/"+player.UserID+"/deposits", playerToken, map[string]any{"amount": 100.00, "payment_method": "card", "payment_token": "tok_123", "currency": "USD"}, nil, http.StatusAccepted)

	var event createdEvent
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/events", adminToken, map[string]any{
		"external_event_id": "feed_evt_1",
		"sport":             "soccer",
		"league":            "English Premier League",
		"home_team":         "Manchester United",
		"away_team":         "Liverpool",
		"scheduled_start":   time.Now().UTC().Add(2 * time.Hour).Format(time.RFC3339),
		"venue":             "Old Trafford",
		"country":           "England",
	}, &event, http.StatusCreated)

	var market createdMarket
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/markets", adminToken, map[string]any{
		"event_id":    event.EventID,
		"market_type": "moneyline",
		"status":      "open",
		"outcomes": []map[string]any{
			{"name": "Manchester United", "outcome_id": "11111111-1111-1111-1111-111111111111"},
			{"name": "Liverpool", "outcome_id": "22222222-2222-2222-2222-222222222222"},
		},
		"odds": map[string]any{
			"11111111-1111-1111-1111-111111111111": 2.10,
			"22222222-2222-2222-2222-222222222222": 1.90,
		},
	}, &market, http.StatusCreated)

	var bet placedBet
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/bets", playerToken, map[string]any{
		"user_id":    player.UserID,
		"market_id":  market.MarketID,
		"outcome_id": "11111111-1111-1111-1111-111111111111",
		"stake":      10.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       2.10,
	}, &bet, http.StatusCreated)

	if strings.TrimSpace(bet.BetID) == "" {
		t.Fatalf("expected placed bet id")
	}

	var bets listedBets
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+player.UserID+"/bets", playerToken, nil, &bets, http.StatusOK)
	if len(bets.Data) != 1 || bets.Data[0].BetID != bet.BetID {
		t.Fatalf("expected listed bet %s, got %+v", bet.BetID, bets.Data)
	}

	var batch settlementBatch
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/settlement-batches", adminToken, map[string]any{
		"market_ids": []string{market.MarketID},
		"winning_outcomes": map[string]any{
			market.MarketID: "11111111-1111-1111-1111-111111111111",
		},
		"settlement_type": "automatic",
	}, &batch, http.StatusAccepted)
	if strings.TrimSpace(batch.BatchID) == "" || batch.Status != "processing" {
		t.Fatalf("expected settlement batch creation response, got %+v", batch)
	}

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/settlement-batches/"+batch.BatchID, adminToken, nil, &batch, http.StatusOK)
	if batch.Status != "completed" || batch.BetCount != 1 || batch.SettledCount != 1 || batch.TotalPayout != "11" {
		t.Fatalf("expected completed settlement batch, got %+v", batch)
	}

	var batchList settlementBatchList
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/settlement-batches?status=completed", adminToken, nil, &batchList, http.StatusOK)
	if len(batchList.Data) == 0 || batchList.Data[0].BatchID != batch.BatchID {
		t.Fatalf("expected settlement batch list to include %s, got %+v", batch.BatchID, batchList.Data)
	}

	var payout manualPayout
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/payouts/manual", adminToken, map[string]any{
		"user_id":      player.UserID,
		"amount":       5.00,
		"reason":       "voided_bet",
		"reference_id": bet.BetID,
	}, &payout, http.StatusCreated)
	if strings.TrimSpace(payout.PayoutID) == "" || payout.Status != "processed" || payout.Amount != "5" {
		t.Fatalf("expected processed manual payout, got %+v", payout)
	}

	var reconciliation reconciliationResponse
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/reconciliation", adminToken, map[string]any{
		"batch_id":             batch.BatchID,
		"reconciliation_type":  "full_audit",
	}, &reconciliation, http.StatusAccepted)
	if strings.TrimSpace(reconciliation.ReconciliationID) == "" {
		t.Fatalf("expected reconciliation id, got %+v", reconciliation)
	}

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/reconciliation/"+reconciliation.ReconciliationID, adminToken, nil, &reconciliation, http.StatusOK)
	if reconciliation.Status != "completed" || reconciliation.BatchID != batch.BatchID || reconciliation.DiscrepanciesFound != 0 {
		t.Fatalf("expected completed reconciliation without discrepancies, got %+v", reconciliation)
	}

	var summary walletSummary
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/wallets/"+player.UserID, playerToken, nil, &summary, http.StatusOK)
	if summary.UserID != player.UserID || summary.Balance != "116" || summary.Available != "116" || summary.Reserved != "0" {
		t.Fatalf("expected settled wallet summary with 116 available, got %+v", summary)
	}

	var transactions walletTransactionList
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/wallets/"+player.UserID+"/transactions?limit=20", playerToken, nil, &transactions, http.StatusOK)
	if !containsTransaction(transactions, "bet_win", "11", bet.BetID) {
		t.Fatalf("expected bet_win transaction for %s, got %+v", bet.BetID, transactions.Data)
	}
	if !containsTransaction(transactions, "bet_refund", "5", bet.BetID) {
		t.Fatalf("expected manual payout refund transaction for %s, got %+v", bet.BetID, transactions.Data)
	}

	var profile userProfile
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+player.UserID+"/profile", "", nil, &profile, http.StatusOK)
	if profile.UserID != player.UserID || profile.Stats.TotalBets != 1 {
		t.Fatalf("expected player profile with one bet, got %+v", profile)
	}

	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/users/"+player.UserID+"/follow/"+admin.UserID, playerToken, nil, nil, http.StatusCreated)

	var followers socialFollowers
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+admin.UserID+"/followers", "", nil, &followers, http.StatusOK)
	if len(followers.Data) != 1 || followers.Data[0].UserID != player.UserID {
		t.Fatalf("expected admin followers to include player, got %+v", followers.Data)
	}

	var feed socialFeed
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/feed?feed_type=all", playerToken, nil, &feed, http.StatusOK)
	if len(feed.Data) == 0 || feed.Data[0].ActivityType != "bet_placed" || feed.Data[0].Details.BetID != bet.BetID {
		t.Fatalf("expected social feed to contain placed bet %s, got %+v", bet.BetID, feed.Data)
	}

	var message socialMessage
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/messages", playerToken, map[string]any{
		"to_user_id":   admin.UserID,
		"message":      "Nice market.",
		"message_type": "text",
	}, &message, http.StatusCreated)
	if strings.TrimSpace(message.MessageID) == "" || message.ToUserID != admin.UserID {
		t.Fatalf("expected social message to admin, got %+v", message)
	}

	var conversation socialConversation
	conversationID := conversationKey(player.UserID, admin.UserID)
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/messages/"+conversationID, adminToken, nil, &conversation, http.StatusOK)
	if conversation.ConversationID != conversationID || conversation.WithUserID != player.UserID || len(conversation.Messages) != 1 {
		t.Fatalf("expected social conversation %s, got %+v", conversationID, conversation)
	}

	var limit complianceLimit
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/users/"+player.UserID+"/limits", playerToken, map[string]any{
		"limit_type":     "daily_loss",
		"limit_amount":   100.00,
		"currency":       "USD",
		"effective_date": time.Now().UTC().Format(time.RFC3339),
	}, &limit, http.StatusCreated)
	if limit.UserID != player.UserID || limit.LimitType != "daily_loss" || strings.TrimSpace(limit.LimitID) == "" {
		t.Fatalf("expected compliance limit for player, got %+v", limit)
	}

	var limits complianceLimitsResponse
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+player.UserID+"/limits", playerToken, nil, &limits, http.StatusOK)
	if len(limits.Limits) == 0 || limits.Limits[0].LimitType != "daily_loss" {
		t.Fatalf("expected daily_loss limit, got %+v", limits)
	}

	var aml amlCheckResponse
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/aml-check", operatorToken, map[string]any{
		"user_id":       player.UserID,
		"full_name":     "Player One",
		"date_of_birth": "1990-01-01T00:00:00Z",
		"country":       "MT",
	}, &aml, http.StatusAccepted)
	if aml.UserID != player.UserID || strings.TrimSpace(aml.CheckID) == "" || aml.Status != "in_progress" {
		t.Fatalf("expected aml check response, got %+v", aml)
	}

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/aml-check/"+aml.CheckID, adminToken, nil, &aml, http.StatusOK)
	if aml.Status != "completed" {
		t.Fatalf("expected completed aml check, got %+v", aml)
	}

	var alert complianceAlert
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/compliance-alerts", systemToken, map[string]any{
		"alert_type":  "unusual_activity",
		"user_id":     player.UserID,
		"description": "velocity spike during integration test",
		"severity":    "high",
	}, &alert, http.StatusCreated)
	if strings.TrimSpace(alert.AlertID) == "" || alert.Status != "open" {
		t.Fatalf("expected compliance alert, got %+v", alert)
	}

	var exclusion selfExclusion
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/users/"+player.UserID+"/self-exclude", playerToken, map[string]any{
		"exclusion_type": "permanent",
		"reason":         "player_request",
		"duration_days":  nil,
	}, &exclusion, http.StatusCreated)
	if exclusion.UserID != player.UserID || exclusion.Status != "active" || strings.TrimSpace(exclusion.ExclusionID) == "" {
		t.Fatalf("expected self exclusion, got %+v", exclusion)
	}

	var restrictions restrictionsResponse
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+player.UserID+"/restrictions", adminToken, nil, &restrictions, http.StatusOK)
	if len(restrictions.Restrictions) < 2 {
		t.Fatalf("expected at least 2 restrictions, got %+v", restrictions)
	}

	var tracked trackedAnalyticsEvent
	requestJSON(t, http.MethodPost, analyticsBase+"/api/v1/events", systemToken, map[string]any{
		"event_type": "bet_placed",
		"user_id":    player.UserID,
		"properties": map[string]any{
			"bet_id":    bet.BetID,
			"market_id": market.MarketID,
		},
	}, &tracked, http.StatusAccepted)
	if strings.TrimSpace(tracked.EventID) == "" || tracked.Status != "queued" {
		t.Fatalf("expected tracked analytics event, got %+v", tracked)
	}

	var userReport analyticsUserReport
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/reports/user/"+player.UserID, playerToken, nil, &userReport, http.StatusOK)
	if userReport.UserID != player.UserID || userReport.Stats.TotalBets != 1 {
		t.Fatalf("expected analytics user report with one bet, got %+v", userReport)
	}

	var dashboard analyticsPlatformDashboard
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/dashboards/platform", adminToken, nil, &dashboard, http.StatusOK)
	if dashboard.Metrics.TotalBets < 1 || dashboard.Metrics.ActiveUsers < 1 {
		t.Fatalf("expected analytics dashboard metrics, got %+v", dashboard)
	}

	var marketReport analyticsMarketReport
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/reports/markets?limit=10", adminToken, nil, &marketReport, http.StatusOK)
	if len(marketReport.Data) == 0 || marketReport.Data[0].MarketID != market.MarketID {
		t.Fatalf("expected analytics market report for market %s, got %+v", market.MarketID, marketReport)
	}

	var cohorts analyticsCohorts
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/cohorts?cohort_type=region", analystToken, nil, &cohorts, http.StatusOK)
	if len(cohorts.Cohorts) == 0 {
		t.Fatalf("expected analytics cohorts response, got %+v", cohorts)
	}

	var prefs notificationPreferencesResponse
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+player.UserID+"/notification-preferences", playerToken, nil, &prefs, http.StatusOK)
	if !prefs.Preferences.MarketingEmails || !prefs.Preferences.BetNotifications || !prefs.Preferences.PushNotifications {
		t.Fatalf("expected default notification preferences, got %+v", prefs)
	}

	var prefsUpdated notificationPreferencesUpdateResponse
	requestJSON(t, http.MethodPut, gatewayBase+"/api/v1/users/"+player.UserID+"/notification-preferences", playerToken, map[string]any{
		"marketing_emails":   false,
		"push_notifications": true,
		"quiet_hours": map[string]any{
			"enabled": true,
			"start":   "22:00",
			"end":     "08:00",
		},
	}, &prefsUpdated, http.StatusOK)
	if prefsUpdated.UserID != player.UserID {
		t.Fatalf("expected updated preferences for player, got %+v", prefsUpdated)
	}

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/users/"+player.UserID+"/notification-preferences", playerToken, nil, &prefs, http.StatusOK)
	if prefs.Preferences.MarketingEmails || !prefs.Preferences.QuietHours.Enabled {
		t.Fatalf("expected updated notification preferences, got %+v", prefs)
	}

	var templates notificationTemplates
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/templates", adminToken, nil, &templates, http.StatusOK)
	if len(templates.Data) == 0 || templates.Data[0].TemplateID == "" {
		t.Fatalf("expected notification templates, got %+v", templates)
	}

	var queued queuedNotification
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/notifications", systemToken, map[string]any{
		"user_id":           player.UserID,
		"notification_type": "bet_settled",
		"channels":          []string{"email", "push"},
		"template_id":       "bet_settled_win",
		"variables": map[string]any{
			"bet_id": bet.BetID,
			"profit": 11.00,
		},
		"priority": "normal",
	}, &queued, http.StatusAccepted)
	if strings.TrimSpace(queued.NotificationID) == "" || queued.UserID != player.UserID {
		t.Fatalf("expected queued notification for player, got %+v", queued)
	}

	var statusUpdate notificationStatusUpdate
	requestJSON(t, http.MethodPut, gatewayBase+"/api/v1/notifications/"+queued.NotificationID+"/status", systemToken, map[string]any{
		"channel": "email",
		"status":  "delivered",
	}, &statusUpdate, http.StatusOK)
	if statusUpdate.ChannelStatuses["email"] != "delivered" {
		t.Fatalf("expected delivered email status, got %+v", statusUpdate)
	}

	var notification notificationDetail
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/notifications/"+queued.NotificationID, adminToken, nil, &notification, http.StatusOK)
	if notification.NotificationID != queued.NotificationID || notification.NotificationType != "bet_settled" {
		t.Fatalf("expected notification detail, got %+v", notification)
	}

	var page cmsPage
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/pages", adminToken, map[string]any{
		"title":      "How to Place a Bet",
		"slug":       "how-to-place-a-bet",
		"content":    "<h1>How to Place a Bet</h1><p>Pick an outcome and confirm.</p>",
		"meta_title": "How to Place a Bet | Phoenix",
		"published":  true,
	}, &page, http.StatusCreated)
	if strings.TrimSpace(page.PageID) == "" || page.Title != "How to Place a Bet" {
		t.Fatalf("expected cms page, got %+v", page)
	}

	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/pages/"+page.PageID, "", nil, &page, http.StatusOK)
	if page.PageID == "" || page.Slug != "how-to-place-a-bet" || page.Content == "" {
		t.Fatalf("expected public cms page detail, got %+v", page)
	}

	var pages cmsPages
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/pages?published=true", "", nil, &pages, http.StatusOK)
	if len(pages.Data) == 0 || pages.Data[0].PageID != page.PageID {
		t.Fatalf("expected cms pages list to include %s, got %+v", page.PageID, pages.Data)
	}

	var promo cmsPromotion
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/promotions", adminToken, map[string]any{
		"name":            "Welcome Bonus",
		"description":     "Get 50% bonus on your first deposit",
		"promotion_type":  "deposit_bonus",
		"rules":           map[string]any{"bonus_percentage": 50, "max_bonus": 500, "wagering_requirement": 5},
		"start_date":      time.Now().UTC().Add(-1 * time.Hour).Format(time.RFC3339),
		"end_date":        time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339),
		"active":          true,
	}, &promo, http.StatusCreated)
	if strings.TrimSpace(promo.PromotionID) == "" || promo.Status != "active" {
		t.Fatalf("expected cms promotion, got %+v", promo)
	}

	var promotions cmsPromotions
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/promotions", "", nil, &promotions, http.StatusOK)
	if len(promotions.Data) == 0 || promotions.Data[0].PromotionID != promo.PromotionID {
		t.Fatalf("expected public promotions to include %s, got %+v", promo.PromotionID, promotions.Data)
	}

	var banner cmsBanner
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/banners", adminToken, map[string]any{
		"title":      "March Madness Betting",
		"image_url":  "https://cdn.phoenix.com/banners/march-madness.jpg",
		"link":       "/promos/march-madness",
		"position":   "homepage_hero",
		"start_date": time.Now().UTC().Add(-1 * time.Hour).Format(time.RFC3339),
		"end_date":   time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339),
	}, &banner, http.StatusCreated)
	if strings.TrimSpace(banner.BannerID) == "" || banner.Title != "March Madness Betting" {
		t.Fatalf("expected cms banner, got %+v", banner)
	}

	var banners cmsBanners
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/banners?position=homepage_hero", "", nil, &banners, http.StatusOK)
	if len(banners.Data) == 0 || banners.Data[0].BannerID != banner.BannerID {
		t.Fatalf("expected public banners to include %s, got %+v", banner.BannerID, banners.Data)
	}

	var achievement engagementAchievement
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/achievements/stream", systemToken, map[string]any{
		"event_type":     "achievement_unlocked",
		"achievement_id": "ach_first_bet",
		"user_id":        player.UserID,
		"reward_points":  50,
	}, &achievement, http.StatusAccepted)
	if achievement.UserID != player.UserID || achievement.AchievementID != "ach_first_bet" || achievement.RewardPoints != 50 {
		t.Fatalf("expected engagement achievement response, got %+v", achievement)
	}

	var points engagementPoints
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/points/calculate", systemToken, map[string]any{
		"user_id":    player.UserID,
		"event_type": "bet_placed",
		"event_data": map[string]any{"stake": 50.0, "odds": 1.85},
	}, &points, http.StatusAccepted)
	if points.UserID != player.UserID || points.PointsAwarded != 75 || strings.TrimSpace(points.CalculationID) == "" {
		t.Fatalf("expected engagement points calculation, got %+v", points)
	}

	var aggregation engagementAggregation
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/aggregations/compute", analystToken, map[string]any{
		"user_id":          player.UserID,
		"aggregation_type": "daily_stats",
		"period":           time.Now().UTC().Format("2006-01-02"),
	}, &aggregation, http.StatusAccepted)
	if aggregation.UserID != player.UserID || strings.TrimSpace(aggregation.AggregationID) == "" || aggregation.Status != "processing" {
		t.Fatalf("expected engagement aggregation response, got %+v", aggregation)
	}

	var score engagementScore
	requestJSON(t, http.MethodGet, gatewayBase+"/api/v1/engagement-score/"+player.UserID, playerToken, nil, &score, http.StatusOK)
	if score.UserID != player.UserID || score.EngagementScore != 125 || score.Components["betting_activity"] != 75 || score.Components["achievements"] != 50 {
		t.Fatalf("expected engagement score response, got %+v", score)
	}
}

type serviceProcess struct {
	name   string
	cmd    *exec.Cmd
	stderr *bytes.Buffer
	stdout *bytes.Buffer
}

func startService(t *testing.T, ctx context.Context, dir string, env map[string]string, healthURL string) *serviceProcess {
	t.Helper()
	cmd := exec.CommandContext(ctx, "go", "run", "./cmd/server")
	cmd.Dir = dir
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Env = os.Environ()
	for key, value := range env {
		cmd.Env = append(cmd.Env, key+"="+value)
	}
	stdout := &bytes.Buffer{}
	stderr := &bytes.Buffer{}
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	if err := cmd.Start(); err != nil {
		t.Fatalf("start service %s: %v", dir, err)
	}
	proc := &serviceProcess{name: filepath.Base(dir), cmd: cmd, stdout: stdout, stderr: stderr}
	waitForHealth(t, proc, healthURL)
	return proc
}

func freePort(t *testing.T) int {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("allocate free port: %v", err)
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port
}

func (p *serviceProcess) Stop() {
	if p == nil || p.cmd == nil || p.cmd.Process == nil {
		return
	}
	_ = syscall.Kill(-p.cmd.Process.Pid, syscall.SIGKILL)
	_, _ = p.cmd.Process.Wait()
}

func waitForHealth(t *testing.T, proc *serviceProcess, healthURL string) {
	t.Helper()
	client := &http.Client{Timeout: 2 * time.Second}
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		if proc.cmd.ProcessState != nil && proc.cmd.ProcessState.Exited() {
			t.Fatalf("service %s exited early\nstdout:\n%s\nstderr:\n%s", proc.name, proc.stdout.String(), proc.stderr.String())
		}
		resp, err := client.Get(healthURL)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatalf("service %s did not become healthy\nstdout:\n%s\nstderr:\n%s", proc.name, proc.stdout.String(), proc.stderr.String())
}

func codexPrepRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("unable to resolve current file path")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func recreateDatabase(t *testing.T, ctx context.Context, adminDSN, dbName string) string {
	t.Helper()
	adminPool, err := pgxpool.New(ctx, adminDSN)
	if err != nil {
		t.Fatalf("connect admin db: %v", err)
	}
	defer adminPool.Close()
	_, _ = adminPool.Exec(ctx, fmt.Sprintf("DROP DATABASE IF EXISTS %s WITH (FORCE)", quoteIdentifier(dbName)))
	if _, err := adminPool.Exec(ctx, fmt.Sprintf("CREATE DATABASE %s", quoteIdentifier(dbName))); err != nil {
		t.Fatalf("create test db: %v", err)
	}
	base := adminDSN
	if idx := strings.LastIndex(base, "/"); idx != -1 {
		if q := strings.Index(base[idx+1:], "?"); q != -1 {
			base = base[:idx+1] + dbName + base[idx+1+q:]
		} else {
			base = base[:idx+1] + dbName
		}
	}
	return base
}

func quoteIdentifier(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func applyMigrations(t *testing.T, ctx context.Context, dsn string, migrationsDir string) {
	t.Helper()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect test db: %v", err)
	}
	defer pool.Close()
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatalf("read migrations: %v", err)
	}
	files := make([]string, 0)
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".sql") || len(name) < 3 || name[0] < '0' || name[0] > '9' {
			continue
		}
		files = append(files, name)
	}
	sort.Strings(files)
	for _, name := range files {
		content, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		sql := string(content)
		if idx := strings.Index(sql, "-- Down"); idx != -1 {
			sql = sql[:idx]
		}
		if _, err := pool.Exec(ctx, sql); err != nil {
			t.Fatalf("apply migration %s: %v", name, err)
		}
	}
}

func flushRedis(t *testing.T, ctx context.Context, addr, password string) {
	t.Helper()
	client := redis.NewClient(&redis.Options{Addr: addr, Password: password})
	defer client.Close()
	if err := client.FlushDB(ctx).Err(); err != nil {
		t.Fatalf("flush redis: %v", err)
	}
}

func registerUser(t *testing.T, gatewayBase string, payload map[string]any) registeredUser {
	t.Helper()
	var out registeredUser
	requestJSON(t, http.MethodPost, gatewayBase+"/api/v1/users", "", payload, &out, http.StatusCreated)
	return out
}

func loginUser(t *testing.T, gatewayBase, identifier, password string) string {
	t.Helper()
	var out loginResponse
	requestJSON(t, http.MethodPost, gatewayBase+"/auth/login", "", map[string]any{"identifier": identifier, "password": password}, &out, http.StatusOK)
	if strings.TrimSpace(out.AccessToken) == "" {
		t.Fatalf("expected access token in login response")
	}
	return out.AccessToken
}

func setUserRole(t *testing.T, ctx context.Context, dsn, userID, role string) {
	t.Helper()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect test db for role update: %v", err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1`, userID, role); err != nil {
		t.Fatalf("update user role: %v", err)
	}
}

func requestJSON(t *testing.T, method, url, token string, body any, out any, expectedStatus int) {
	t.Helper()
	var payload io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		payload = bytes.NewReader(encoded)
	}
	req, err := http.NewRequest(method, url, payload)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
	if err != nil {
		t.Fatalf("perform request %s %s: %v", method, url, err)
	}
	defer resp.Body.Close()
	responseBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != expectedStatus {
		t.Fatalf("unexpected status for %s %s: got %d want %d body=%s", method, url, resp.StatusCode, expectedStatus, string(responseBody))
	}
	if out != nil {
		if err := json.Unmarshal(responseBody, out); err != nil {
			t.Fatalf("decode response: %v body=%s", err, string(responseBody))
		}
	}
}

func conversationKey(a, b string) string {
	parts := []string{strings.TrimSpace(a), strings.TrimSpace(b)}
	sort.Strings(parts)
	sum := sha1.Sum([]byte(strings.Join(parts, ":")))
	return "conv_" + hex.EncodeToString(sum[:])
}

func containsTransaction(list walletTransactionList, txType string, amount string, reference string) bool {
	for _, item := range list.Data {
		if item.Type == txType && item.Amount == amount && item.Reference == reference {
			return true
		}
	}
	return false
}
