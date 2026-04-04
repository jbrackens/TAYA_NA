package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-analytics/internal/models"
)

type fakeRepo struct{}

func (f *fakeRepo) TrackEvent(ctx context.Context, actorID string, req models.TrackEventRequest) (*models.TrackEventResponse, error) {
	return &models.TrackEventResponse{EventID: "evt_1", Status: "queued", ReceivedAt: time.Now().UTC()}, nil
}
func (f *fakeRepo) GetUserReport(ctx context.Context, userID string, startDate, endDate time.Time) (*models.UserReportResponse, error) {
	return &models.UserReportResponse{UserID: userID, Stats: models.UserStats{TotalStake: decimal.NewFromInt(10)}}, nil
}
func (f *fakeRepo) GetPlatformDashboard(ctx context.Context, date time.Time) (*models.PlatformDashboardResponse, error) {
	return &models.PlatformDashboardResponse{Date: date.Format("2006-01-02")}, nil
}
func (f *fakeRepo) GetMarketReport(ctx context.Context, startDate, endDate time.Time, limit int) (*models.MarketReportResponse, error) {
	return &models.MarketReportResponse{}, nil
}
func (f *fakeRepo) GetCohorts(ctx context.Context, cohortType string, startDate, endDate time.Time) (*models.CohortsResponse, error) {
	return &models.CohortsResponse{}, nil
}
func (f *fakeRepo) ExportUserTransactions(ctx context.Context, userID, txType, product string, startDate, endDate time.Time) ([]models.TransactionExportRow, error) {
	return []models.TransactionExportRow{
		{
			TransactionID: "tx_1",
			UserID:        userID,
			Username:      "demo",
			Email:         "demo@example.com",
			Type:          "deposit",
			Product:       "wallet",
			Amount:        decimal.RequireFromString("25.00"),
			Reference:     "card",
			CreatedAt:     time.Date(2026, 3, 12, 10, 0, 0, 0, time.UTC),
		},
	}, nil
}
func (f *fakeRepo) ExportExcludedPunters(ctx context.Context) ([]models.ExcludedPunterExportRow, error) {
	return []models.ExcludedPunterExportRow{
		{
			UserID:        "u1",
			Username:      "demo",
			Email:         "demo@example.com",
			ExclusionType: "temporary",
			Reason:        "player_request",
			Status:        "active",
			EffectiveAt:   time.Date(2026, 3, 12, 9, 0, 0, 0, time.UTC),
		},
	}, nil
}
func (f *fakeRepo) GetDailyTransactionSummary(ctx context.Context, startDate, endDate time.Time) (*models.DailyTransactionSummary, error) {
	return &models.DailyTransactionSummary{
		DepositsCount:     2,
		DepositsAmount:    decimal.RequireFromString("50.00"),
		WithdrawalsCount:  1,
		WithdrawalsAmount: decimal.RequireFromString("10.00"),
		NetCash:           decimal.RequireFromString("40.00"),
	}, nil
}
func (f *fakeRepo) CountActiveExclusions(ctx context.Context, startDate, endDate time.Time) (int, error) {
	return 3, nil
}
func (f *fakeRepo) ListWalletCorrectionTasks(ctx context.Context, userID, status string, limit int) ([]models.WalletCorrectionTask, error) {
	return []models.WalletCorrectionTask{
		{
			TaskID:                   "negative_balance:u1",
			UserID:                   firstNonEmptyString(userID, "u1"),
			Type:                     "negative_balance",
			Status:                   "open",
			CurrentBalanceCents:      -1200,
			SuggestedAdjustmentCents: 1200,
			Reason:                   "wallet balance is below zero",
			UpdatedAt:                time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC),
		},
		{
			TaskID:                   "manual_review:tx_1",
			UserID:                   firstNonEmptyString(userID, "u1"),
			Type:                     "manual_review",
			Status:                   "open",
			CurrentBalanceCents:      5000,
			SuggestedAdjustmentCents: 0,
			Reason:                   "withdrawal via pxp awaiting operator review",
			UpdatedAt:                time.Date(2026, 3, 15, 13, 0, 0, 0, time.UTC),
		},
	}, nil
}
func (f *fakeRepo) GetPromoUsageSummary(ctx context.Context, filter models.PromoUsageFilters) (*models.PromoUsageSummary, error) {
	return &models.PromoUsageSummary{
		TotalBets:                3,
		TotalStakeCents:          12500,
		BetsWithFreebet:          2,
		BetsWithOddsBoost:        2,
		BetsWithBoth:             1,
		TotalFreebetAppliedCents: 5000,
		TotalBoostedStakeCents:   7500,
		UniqueUsers:              2,
		UniqueFreebets:           1,
		UniqueOddsBoosts:         2,
		Freebets: []models.PromoUsageBreakdown{
			{ID: "fb-1", BetCount: 2, TotalStakeCents: 5000, TotalFreebetAppliedCents: 5000},
		},
		OddsBoosts: []models.PromoUsageBreakdown{
			{ID: "ob-1", BetCount: 1, TotalStakeCents: 2500, TotalFreebetAppliedCents: 0},
			{ID: "ob-2", BetCount: 1, TotalStakeCents: 5000, TotalFreebetAppliedCents: 5000},
		},
	}, nil
}
func (f *fakeRepo) GetRiskFeatureSnapshot(ctx context.Context, userID string) (*models.RiskFeatureSnapshot, error) {
	return &models.RiskFeatureSnapshot{
		UserID:                   userID,
		SportsbookPlacedCount:    5,
		SportsbookSettledCount:   3,
		SportsbookVoidedCount:    1,
		PredictionPlacedCount:    2,
		PredictionSettledCount:   1,
		PredictionCancelledCount: 1,
		TotalStake:               decimal.RequireFromString("235.00"),
		LifetimeDeposits:         decimal.RequireFromString("400.00"),
		CurrentBalance:           decimal.RequireFromString("55.00"),
		PendingReviewCount:       1,
		LastActivityAt:           time.Now().UTC().Add(-36 * time.Hour),
	}, nil
}
func (f *fakeRepo) DiscoverRiskUserIDs(ctx context.Context, limit int) ([]string, error) {
	return []string{"u1", "u2"}, nil
}
func (f *fakeRepo) GetProviderFeedHealth(ctx context.Context, thresholds models.ProviderFeedThresholds) (*models.FeedHealthResponse, error) {
	return &models.FeedHealthResponse{
		Enabled:    true,
		Thresholds: thresholds,
		Summary: models.ProviderFeedSummary{
			StreamCount:      2,
			UnhealthyStreams: 1,
			TotalApplied:     12,
			TotalErrors:      1,
			MaxLagMs:         4500,
		},
		Cancel: models.ProviderCancelMetrics{
			TotalAttempts: 3,
			TotalRetries:  1,
			TotalFallback: 1,
			TotalSuccess:  1,
			TotalFailed:   1,
		},
		Streams: []models.ProviderFeedStreamStatus{
			{
				Adapter:     "oddin",
				Stream:      "events",
				State:       "connected",
				Applied:     7,
				LastLagMs:   1200,
				LastEventAt: "2026-03-16T10:00:00Z",
				UpdatedAt:   "2026-03-16T10:00:00Z",
			},
			{
				Adapter:       "pxp",
				Stream:        "payments",
				State:         "error",
				Applied:       5,
				ErrorCount:    1,
				LastRequestID: "pxp_123",
				LastPlayerID:  "u1",
				LastLagMs:     4500,
				LastEventAt:   "2026-03-16T09:59:56Z",
				UpdatedAt:     "2026-03-16T09:59:56Z",
				LastError:     "declined by provider",
			},
		},
	}, nil
}
func (f *fakeRepo) ListProviderStreamAcknowledgements(ctx context.Context) ([]models.ProviderStreamAcknowledgement, error) {
	return []models.ProviderStreamAcknowledgement{
		{
			StreamKey:      "oddin:events",
			Adapter:        "oddin",
			Stream:         "events",
			Operator:       "ops.jane",
			Note:           "Investigating lag spike",
			Status:         "acknowledged",
			LastAction:     "acknowledged",
			AcknowledgedAt: "2026-03-16T10:05:00Z",
			UpdatedBy:      "admin-1",
		},
	}, nil
}
func (f *fakeRepo) UpsertProviderStreamAcknowledgement(ctx context.Context, actorID string, req models.ProviderStreamAcknowledgementRequest) (*models.ProviderStreamAcknowledgement, error) {
	status := "acknowledged"
	lastAction := "acknowledged"
	switch req.Action {
	case "resolve":
		status = "resolved"
		lastAction = "resolved"
	case "reassign":
		lastAction = "reassigned"
	case "reopen":
		lastAction = "reopened"
	}
	return &models.ProviderStreamAcknowledgement{
		StreamKey:      req.StreamKey,
		Adapter:        req.Adapter,
		Stream:         req.Stream,
		Operator:       req.Operator,
		Note:           req.Note,
		Status:         status,
		LastAction:     lastAction,
		AcknowledgedAt: "2026-03-16T10:06:00Z",
		UpdatedBy:      actorID,
	}, nil
}
func (f *fakeRepo) GetProviderAcknowledgementSLASettings(ctx context.Context) (*models.ProviderAcknowledgementSLASettingsResponse, error) {
	return &models.ProviderAcknowledgementSLASettingsResponse{
		Default: models.ProviderAcknowledgementSLASetting{
			Adapter:         "",
			WarningMinutes:  15,
			CriticalMinutes: 30,
			UpdatedAt:       "2026-03-16T10:00:00Z",
			UpdatedBy:       "admin-1",
			Source:          "default",
		},
		Overrides: []models.ProviderAcknowledgementSLASetting{
			{
				Adapter:         "oddin",
				WarningMinutes:  10,
				CriticalMinutes: 20,
				UpdatedAt:       "2026-03-16T10:02:00Z",
				UpdatedBy:       "admin-1",
				Source:          "override",
			},
		},
		Effective: []models.ProviderAcknowledgementSLASetting{
			{
				Adapter:         "oddin",
				WarningMinutes:  10,
				CriticalMinutes: 20,
				UpdatedAt:       "2026-03-16T10:02:00Z",
				UpdatedBy:       "admin-1",
				Source:          "override",
			},
		},
	}, nil
}
func (f *fakeRepo) UpsertProviderAcknowledgementSLASetting(ctx context.Context, actorID string, req models.ProviderAcknowledgementSLAUpdateRequest) (*models.ProviderAcknowledgementSLASetting, error) {
	source := "override"
	if strings.TrimSpace(req.Adapter) == "" {
		source = "default"
	}
	return &models.ProviderAcknowledgementSLASetting{
		Adapter:         req.Adapter,
		WarningMinutes:  req.WarningMinutes,
		CriticalMinutes: req.CriticalMinutes,
		UpdatedAt:       "2026-03-16T10:07:00Z",
		UpdatedBy:       actorID,
		Source:          source,
	}, nil
}

func TestTrackEventRequiresSystem(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.TrackEvent(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, &models.TrackEventRequest{EventType: "bet_placed"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestTrackEventAllowsSystem(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.TrackEvent(context.Background(), models.AuthClaims{UserID: "svc", Role: "system"}, &models.TrackEventRequest{EventType: "bet_placed"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}

func TestUserReportRequiresOwnershipOrAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetUserReport(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2", nil, nil)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCohortsRequireAnalyst(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetCohorts(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "signup_date", nil, nil)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestExportUserTransactionsRequiresAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.ExportUserTransactionsCSV(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u1", "", "", nil, nil)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestExportUserTransactionsCSVIncludesHeaderAndRows(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	data, err := svc.ExportUserTransactionsCSV(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, "u1", "", "", nil, nil)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	content := string(data)
	if !strings.Contains(content, "transaction_id,user_id,username,email,type,product,amount,reference,created_at") {
		t.Fatalf("expected csv header, got %s", content)
	}
	if !strings.Contains(content, "tx_1,u1,demo,demo@example.com,deposit,wallet,25.00,card,2026-03-12T10:00:00Z") {
		t.Fatalf("expected csv row, got %s", content)
	}
}

func TestGenerateDailyReportsRequiresAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GenerateDailyReports(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, nil)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGenerateDailyReportsReturnsBundle(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	response, err := svc.GenerateDailyReports(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, nil)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.ActiveExclusions != 3 {
		t.Fatalf("expected active exclusions, got %d", response.ActiveExclusions)
	}
	if !response.TransactionSummary.NetCash.Equal(decimal.RequireFromString("40.00")) {
		t.Fatalf("expected net cash 40, got %s", response.TransactionSummary.NetCash)
	}
}

func TestListWalletCorrectionTasksRequiresAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.ListWalletCorrectionTasks(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "", "", 25)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestListWalletCorrectionTasksReturnsSummary(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	response, err := svc.ListWalletCorrectionTasks(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, "u1", "", 25)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.Summary.Total != 2 || response.Summary.Open != 2 {
		t.Fatalf("unexpected correction summary: %+v", response.Summary)
	}
	if response.Summary.NegativeBalance != 1 || response.Summary.ManualReview != 1 {
		t.Fatalf("unexpected correction type summary: %+v", response.Summary)
	}
}

func TestGetPromoUsageSummaryRequiresAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetPromoUsageSummary(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, models.PromoUsageFilters{})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGetPromoUsageSummaryReturnsSummaryAndFilters(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	from := time.Date(2026, 3, 15, 10, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 16, 10, 0, 0, 0, time.UTC)
	response, err := svc.GetPromoUsageSummary(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, models.PromoUsageFilters{
		UserID:         "u1",
		FreebetID:      "fb-1",
		OddsBoostID:    "ob-2",
		BreakdownLimit: 5,
		From:           &from,
		To:             &to,
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.Summary.TotalBets != 3 || response.Summary.TotalFreebetAppliedCents != 5000 {
		t.Fatalf("unexpected promo summary: %+v", response.Summary)
	}
	if response.Filters.UserID != "u1" || response.Filters.FreebetID != "fb-1" || response.Filters.OddsBoostID != "ob-2" {
		t.Fatalf("unexpected filters: %+v", response.Filters)
	}
	if response.Filters.From != "2026-03-15T10:00:00Z" || response.Filters.To != "2026-03-16T10:00:00Z" {
		t.Fatalf("unexpected time filters: %+v", response.Filters)
	}
}

func TestGetRiskPlayerScoreRequiresUserID(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetRiskPlayerScore(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, "")
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGetRiskPlayerScoreReturnsModelVersion(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	response, err := svc.GetRiskPlayerScore(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, "u1")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.UserID != "u1" {
		t.Fatalf("expected user id u1, got %s", response.UserID)
	}
	if response.ModelVersion != riskModelVersion {
		t.Fatalf("expected model version %s, got %s", riskModelVersion, response.ModelVersion)
	}
}

func TestGetRiskSegmentsReturnsProfiles(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	response, err := svc.GetRiskSegments(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, "", 20)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.Total != 2 || len(response.Items) != 2 {
		t.Fatalf("unexpected risk segment response: %+v", response)
	}
	if response.Items[0].SegmentID == "" {
		t.Fatalf("expected non-empty segment id")
	}
}

func TestGetProviderFeedHealthRequiresProviderOpsRole(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetProviderFeedHealth(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGetProviderFeedHealthReturnsDerivedResponse(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	response, err := svc.GetProviderFeedHealth(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if !response.Enabled || response.Summary.StreamCount != 2 {
		t.Fatalf("unexpected feed health response: %+v", response)
	}
	if response.Thresholds.MaxLagMs != defaultProviderFeedThresholds.MaxLagMs {
		t.Fatalf("expected default thresholds, got %+v", response.Thresholds)
	}
}

func TestUpsertProviderStreamAcknowledgementValidatesInput(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.UpsertProviderStreamAcknowledgement(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, &models.ProviderStreamAcknowledgementRequest{
		StreamKey: "oddin:events",
		Operator:  "",
		Note:      "missing operator",
	})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestUpsertProviderStreamAcknowledgementNormalizesAndPersists(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	response, err := svc.UpsertProviderStreamAcknowledgement(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, &models.ProviderStreamAcknowledgementRequest{
		Adapter:  "oddin",
		Stream:   "events",
		Action:   "resolve",
		Operator: "ops.jane",
		Note:     "Issue fixed",
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.StreamKey != "oddin:events" || response.Status != "resolved" {
		t.Fatalf("unexpected acknowledgement response: %+v", response)
	}
}

func TestGetProviderAcknowledgementSLASettingsRequiresProviderOpsRole(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetProviderAcknowledgementSLASettings(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestUpsertProviderAcknowledgementSLASettingValidatesThresholds(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.UpsertProviderAcknowledgementSLASetting(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, &models.ProviderAcknowledgementSLAUpdateRequest{
		Adapter:         "oddin",
		WarningMinutes:  20,
		CriticalMinutes: 20,
	})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestUpsertProviderAcknowledgementSLASettingReturnsOverride(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	response, err := svc.UpsertProviderAcknowledgementSLASetting(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, &models.ProviderAcknowledgementSLAUpdateRequest{
		Adapter:         "oddin",
		WarningMinutes:  10,
		CriticalMinutes: 20,
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.Adapter != "oddin" || response.Source != "override" {
		t.Fatalf("unexpected sla response: %+v", response)
	}
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
