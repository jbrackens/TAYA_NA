package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-analytics/internal/models"
	"github.com/phoenixbot/phoenix-analytics/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

const riskModelVersion = "risk-intel-v1"

var defaultProviderFeedThresholds = models.ProviderFeedThresholds{
	MaxLagMs:          6 * 60 * 60 * 1000,
	MaxGapCount:       0,
	MaxDuplicateCount: 50,
}

type Service interface {
	TrackEvent(ctx context.Context, actor models.AuthClaims, req *models.TrackEventRequest) (*models.TrackEventResponse, error)
	GetUserReport(ctx context.Context, actor models.AuthClaims, userID string, startDate, endDate *time.Time) (*models.UserReportResponse, error)
	GetPlatformDashboard(ctx context.Context, actor models.AuthClaims, date *time.Time) (*models.PlatformDashboardResponse, error)
	GetMarketReport(ctx context.Context, actor models.AuthClaims, startDate, endDate *time.Time, limit int) (*models.MarketReportResponse, error)
	GetCohorts(ctx context.Context, actor models.AuthClaims, cohortType string, startDate, endDate *time.Time) (*models.CohortsResponse, error)
	ExportUserTransactionsCSV(ctx context.Context, actor models.AuthClaims, userID, txType, product string, startDate, endDate *time.Time) ([]byte, error)
	ExportExcludedPuntersCSV(ctx context.Context, actor models.AuthClaims) ([]byte, error)
	GenerateDailyReports(ctx context.Context, actor models.AuthClaims, date *time.Time) (*models.DailyReportsResponse, error)
	ListWalletCorrectionTasks(ctx context.Context, actor models.AuthClaims, userID, status string, limit int) (*models.WalletCorrectionTasksResponse, error)
	GetPromoUsageSummary(ctx context.Context, actor models.AuthClaims, filter models.PromoUsageFilters) (*models.PromoUsageResponse, error)
	GetRiskPlayerScore(ctx context.Context, actor models.AuthClaims, userID string) (*models.RiskPlayerScore, error)
	GetRiskSegments(ctx context.Context, actor models.AuthClaims, userID string, limit int) (*models.RiskSegmentsResponse, error)
	GetProviderFeedHealth(ctx context.Context, actor models.AuthClaims) (*models.FeedHealthResponse, error)
	ListProviderStreamAcknowledgements(ctx context.Context, actor models.AuthClaims) (*models.ProviderStreamAcknowledgementsResponse, error)
	UpsertProviderStreamAcknowledgement(ctx context.Context, actor models.AuthClaims, req *models.ProviderStreamAcknowledgementRequest) (*models.ProviderStreamAcknowledgement, error)
	GetProviderAcknowledgementSLASettings(ctx context.Context, actor models.AuthClaims) (*models.ProviderAcknowledgementSLASettingsResponse, error)
	UpsertProviderAcknowledgementSLASetting(ctx context.Context, actor models.AuthClaims, req *models.ProviderAcknowledgementSLAUpdateRequest) (*models.ProviderAcknowledgementSLASetting, error)
}

type analyticsService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &analyticsService{logger: logger, repo: repo}
}

func (s *analyticsService) TrackEvent(ctx context.Context, actor models.AuthClaims, req *models.TrackEventRequest) (*models.TrackEventResponse, error) {
	if !canTrack(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.EventType = strings.TrimSpace(req.EventType)
	req.UserID = strings.TrimSpace(req.UserID)
	if req.EventType == "" {
		return nil, fmt.Errorf("%w: event_type is required", ErrInvalidInput)
	}
	if req.Timestamp.IsZero() {
		req.Timestamp = time.Now().UTC()
	}
	if req.Properties == nil {
		req.Properties = map[string]any{}
	}
	return s.repo.TrackEvent(ctx, actor.UserID, *req)
}

func (s *analyticsService) GetUserReport(ctx context.Context, actor models.AuthClaims, userID string, startDate, endDate *time.Time) (*models.UserReportResponse, error) {
	if actor.UserID != userID && !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	start, end := defaultRange(startDate, endDate)
	return s.repo.GetUserReport(ctx, userID, start, end)
}

func (s *analyticsService) GetPlatformDashboard(ctx context.Context, actor models.AuthClaims, date *time.Time) (*models.PlatformDashboardResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	reference := time.Now().UTC()
	if date != nil {
		reference = date.UTC()
	}
	return s.repo.GetPlatformDashboard(ctx, reference)
}

func (s *analyticsService) GetMarketReport(ctx context.Context, actor models.AuthClaims, startDate, endDate *time.Time, limit int) (*models.MarketReportResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	start, end := defaultRange(startDate, endDate)
	return s.repo.GetMarketReport(ctx, start, end, limit)
}

func (s *analyticsService) GetCohorts(ctx context.Context, actor models.AuthClaims, cohortType string, startDate, endDate *time.Time) (*models.CohortsResponse, error) {
	if !canViewCohorts(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	start, end := defaultRange(startDate, endDate)
	return s.repo.GetCohorts(ctx, cohortType, start, end)
}

func (s *analyticsService) ExportUserTransactionsCSV(ctx context.Context, actor models.AuthClaims, userID, txType, product string, startDate, endDate *time.Time) ([]byte, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	start, end := defaultRange(startDate, endDate)
	rows, err := s.repo.ExportUserTransactions(ctx, userID, normalizeTransactionType(txType), normalizeProduct(product), start, end)
	if err != nil {
		return nil, err
	}
	return buildCSV(
		[]string{"transaction_id", "user_id", "username", "email", "type", "product", "amount", "reference", "created_at"},
		func(writer *csv.Writer) error {
			for _, row := range rows {
				if err := writer.Write([]string{
					row.TransactionID,
					row.UserID,
					row.Username,
					row.Email,
					row.Type,
					row.Product,
					row.Amount.StringFixed(2),
					row.Reference,
					row.CreatedAt.UTC().Format(time.RFC3339),
				}); err != nil {
					return err
				}
			}
			return nil
		},
	)
}

func (s *analyticsService) ExportExcludedPuntersCSV(ctx context.Context, actor models.AuthClaims) ([]byte, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	rows, err := s.repo.ExportExcludedPunters(ctx)
	if err != nil {
		return nil, err
	}
	return buildCSV(
		[]string{"user_id", "username", "email", "exclusion_type", "reason", "status", "effective_at", "expires_at"},
		func(writer *csv.Writer) error {
			for _, row := range rows {
				expiresAt := ""
				if row.ExpiresAt != nil {
					expiresAt = row.ExpiresAt.UTC().Format(time.RFC3339)
				}
				if err := writer.Write([]string{
					row.UserID,
					row.Username,
					row.Email,
					row.ExclusionType,
					row.Reason,
					row.Status,
					row.EffectiveAt.UTC().Format(time.RFC3339),
					expiresAt,
				}); err != nil {
					return err
				}
			}
			return nil
		},
	)
}

func (s *analyticsService) GenerateDailyReports(ctx context.Context, actor models.AuthClaims, date *time.Time) (*models.DailyReportsResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	reference := time.Now().UTC()
	if date != nil {
		reference = date.UTC()
	}
	dayStart := time.Date(reference.Year(), reference.Month(), reference.Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24 * time.Hour)

	dashboard, err := s.repo.GetPlatformDashboard(ctx, dayStart)
	if err != nil {
		return nil, err
	}
	marketReport, err := s.repo.GetMarketReport(ctx, dayStart, dayEnd, 20)
	if err != nil {
		return nil, err
	}
	transactionSummary, err := s.repo.GetDailyTransactionSummary(ctx, dayStart, dayEnd)
	if err != nil {
		return nil, err
	}
	activeExclusions, err := s.repo.CountActiveExclusions(ctx, dayStart, dayEnd)
	if err != nil {
		return nil, err
	}

	return &models.DailyReportsResponse{
		Date:               dayStart.Format("2006-01-02"),
		GeneratedAt:        time.Now().UTC(),
		Dashboard:          *dashboard,
		MarketReport:       *marketReport,
		ActiveExclusions:   activeExclusions,
		TransactionSummary: *transactionSummary,
	}, nil
}

func (s *analyticsService) ListWalletCorrectionTasks(ctx context.Context, actor models.AuthClaims, userID, status string, limit int) (*models.WalletCorrectionTasksResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	items, err := s.repo.ListWalletCorrectionTasks(ctx, strings.TrimSpace(userID), strings.TrimSpace(status), limit)
	if err != nil {
		return nil, err
	}
	summary := models.WalletCorrectionSummary{Total: len(items)}
	for _, item := range items {
		switch strings.ToLower(strings.TrimSpace(item.Status)) {
		case "resolved":
			summary.Resolved++
		default:
			summary.Open++
		}
		switch strings.ToLower(strings.TrimSpace(item.Type)) {
		case "negative_balance":
			summary.NegativeBalance++
		case "ledger_drift":
			summary.LedgerDrift++
		case "manual_review":
			summary.ManualReview++
		}
		summary.SuggestedAdjustSum += item.SuggestedAdjustmentCents
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	if len(items) > limit {
		items = items[:limit]
	}
	return &models.WalletCorrectionTasksResponse{Items: items, Summary: summary}, nil
}

func (s *analyticsService) GetPromoUsageSummary(ctx context.Context, actor models.AuthClaims, filter models.PromoUsageFilters) (*models.PromoUsageResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if filter.BreakdownLimit <= 0 {
		filter.BreakdownLimit = 20
	}
	if filter.BreakdownLimit > 100 {
		filter.BreakdownLimit = 100
	}
	if filter.From != nil && filter.To != nil && filter.To.Before(*filter.From) {
		return nil, fmt.Errorf("%w: to must be greater than or equal to from", ErrInvalidInput)
	}
	filter.UserID = strings.TrimSpace(filter.UserID)
	filter.FreebetID = strings.TrimSpace(filter.FreebetID)
	filter.OddsBoostID = strings.TrimSpace(filter.OddsBoostID)
	summary, err := s.repo.GetPromoUsageSummary(ctx, filter)
	if err != nil {
		return nil, err
	}
	applied := models.PromoUsageAppliedFilters{
		UserID:         filter.UserID,
		FreebetID:      filter.FreebetID,
		OddsBoostID:    filter.OddsBoostID,
		BreakdownLimit: filter.BreakdownLimit,
	}
	if filter.From != nil {
		applied.From = filter.From.UTC().Format(time.RFC3339)
	}
	if filter.To != nil {
		applied.To = filter.To.UTC().Format(time.RFC3339)
	}
	return &models.PromoUsageResponse{Summary: *summary, Filters: applied}, nil
}

func (s *analyticsService) GetRiskPlayerScore(ctx context.Context, actor models.AuthClaims, userID string) (*models.RiskPlayerScore, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidInput)
	}
	features, err := s.repo.GetRiskFeatureSnapshot(ctx, userID)
	if err != nil {
		return nil, err
	}
	score := buildRiskPlayerScore(*features, time.Now().UTC())
	return &score, nil
}

func (s *analyticsService) GetRiskSegments(ctx context.Context, actor models.AuthClaims, userID string, limit int) (*models.RiskSegmentsResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	now := time.Now().UTC()
	items := make([]models.RiskSegmentProfile, 0)

	if trimmedUserID := strings.TrimSpace(userID); trimmedUserID != "" {
		features, err := s.repo.GetRiskFeatureSnapshot(ctx, trimmedUserID)
		if err != nil {
			return nil, err
		}
		score := buildRiskPlayerScore(*features, now)
		items = append(items, buildRiskSegmentProfile(score, *features, now))
		return &models.RiskSegmentsResponse{Items: items, Total: len(items)}, nil
	}

	userIDs, err := s.repo.DiscoverRiskUserIDs(ctx, limit)
	if err != nil {
		return nil, err
	}
	for _, candidate := range userIDs {
		features, err := s.repo.GetRiskFeatureSnapshot(ctx, candidate)
		if err != nil {
			continue
		}
		score := buildRiskPlayerScore(*features, now)
		items = append(items, buildRiskSegmentProfile(score, *features, now))
	}
	return &models.RiskSegmentsResponse{Items: items, Total: len(items)}, nil
}

func (s *analyticsService) GetProviderFeedHealth(ctx context.Context, actor models.AuthClaims) (*models.FeedHealthResponse, error) {
	if !canManageProviderOps(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetProviderFeedHealth(ctx, defaultProviderFeedThresholds)
}

func (s *analyticsService) ListProviderStreamAcknowledgements(ctx context.Context, actor models.AuthClaims) (*models.ProviderStreamAcknowledgementsResponse, error) {
	if !canManageProviderOps(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	items, err := s.repo.ListProviderStreamAcknowledgements(ctx)
	if err != nil {
		return nil, err
	}
	return &models.ProviderStreamAcknowledgementsResponse{Items: items}, nil
}

func (s *analyticsService) UpsertProviderStreamAcknowledgement(ctx context.Context, actor models.AuthClaims, req *models.ProviderStreamAcknowledgementRequest) (*models.ProviderStreamAcknowledgement, error) {
	if !canManageProviderOps(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.Adapter = strings.TrimSpace(req.Adapter)
	req.Stream = strings.TrimSpace(req.Stream)
	req.StreamKey = strings.TrimSpace(req.StreamKey)
	req.Action = strings.ToLower(strings.TrimSpace(req.Action))
	req.Operator = strings.TrimSpace(req.Operator)
	req.Note = strings.TrimSpace(req.Note)
	if req.StreamKey == "" {
		if req.Adapter == "" || req.Stream == "" {
			return nil, fmt.Errorf("%w: streamKey or adapter+stream is required", ErrInvalidInput)
		}
		req.StreamKey = req.Adapter + ":" + req.Stream
	}
	if req.Adapter == "" || req.Stream == "" {
		parts := strings.SplitN(req.StreamKey, ":", 2)
		if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" || strings.TrimSpace(parts[1]) == "" {
			return nil, fmt.Errorf("%w: invalid streamKey", ErrInvalidInput)
		}
		req.Adapter = strings.TrimSpace(parts[0])
		req.Stream = strings.TrimSpace(parts[1])
	}
	if req.Operator == "" || req.Note == "" {
		return nil, fmt.Errorf("%w: operator and note are required", ErrInvalidInput)
	}
	switch req.Action {
	case "", "acknowledge", "reassign", "resolve", "reopen":
	default:
		return nil, fmt.Errorf("%w: unsupported action", ErrInvalidInput)
	}
	return s.repo.UpsertProviderStreamAcknowledgement(ctx, actor.UserID, *req)
}

func (s *analyticsService) GetProviderAcknowledgementSLASettings(ctx context.Context, actor models.AuthClaims) (*models.ProviderAcknowledgementSLASettingsResponse, error) {
	if !canManageProviderOps(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetProviderAcknowledgementSLASettings(ctx)
}

func (s *analyticsService) UpsertProviderAcknowledgementSLASetting(ctx context.Context, actor models.AuthClaims, req *models.ProviderAcknowledgementSLAUpdateRequest) (*models.ProviderAcknowledgementSLASetting, error) {
	if !canManageProviderOps(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.Adapter = strings.TrimSpace(req.Adapter)
	if req.WarningMinutes <= 0 {
		return nil, fmt.Errorf("%w: warningMinutes must be positive", ErrInvalidInput)
	}
	if req.CriticalMinutes <= req.WarningMinutes {
		return nil, fmt.Errorf("%w: criticalMinutes must be greater than warningMinutes", ErrInvalidInput)
	}
	return s.repo.UpsertProviderAcknowledgementSLASetting(ctx, actor.UserID, *req)
}

func defaultRange(startDate, endDate *time.Time) (time.Time, time.Time) {
	end := time.Now().UTC().Add(24 * time.Hour)
	start := end.AddDate(0, 0, -7)
	if startDate != nil {
		start = startDate.UTC()
	}
	if endDate != nil {
		end = endDate.UTC()
	}
	return start, end
}

func canTrack(role string) bool {
	normalized := normalizeRole(role)
	return normalized == "system" || normalized == "admin"
}

func canViewCohorts(role string) bool {
	normalized := normalizeRole(role)
	return normalized == "analyst" || normalized == "admin"
}

func isAdmin(role string) bool {
	return normalizeRole(role) == "admin"
}

func canManageProviderOps(role string) bool {
	switch normalizeRole(role) {
	case "admin", "operator", "trader":
		return true
	default:
		return false
	}
}

func normalizeRole(role string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
}

func normalizeTransactionType(value string) string {
	switch strings.TrimSpace(value) {
	case "", "all":
		return ""
	case "bet_placed":
		return "bet_place"
	default:
		return value
	}
}

func normalizeProduct(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "all":
		return ""
	case "sportsbook", "prediction", "wallet":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func buildCSV(header []string, writeRows func(*csv.Writer) error) ([]byte, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	if err := writer.Write(header); err != nil {
		return nil, err
	}
	if err := writeRows(writer); err != nil {
		return nil, err
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func buildRiskPlayerScore(features models.RiskFeatureSnapshot, now time.Time) models.RiskPlayerScore {
	placedCount := float64(features.SportsbookPlacedCount + features.PredictionPlacedCount)
	settledCount := float64(features.SportsbookSettledCount + features.PredictionSettledCount)
	cancelledCount := float64(features.SportsbookVoidedCount + features.PredictionCancelledCount)
	totalStakeCents := features.TotalStake.Shift(2).InexactFloat64()
	depositCents := features.LifetimeDeposits.Shift(2).InexactFloat64()
	currentBalanceCents := features.CurrentBalance.Shift(2).InexactFloat64()

	daysSinceActivity := 30.0
	if !features.LastActivityAt.IsZero() {
		daysSinceActivity = now.Sub(features.LastActivityAt.UTC()).Hours() / 24
		if daysSinceActivity < 0 {
			daysSinceActivity = 0
		}
	}

	cancelRatio := safeRatio(cancelledCount, placedCount)
	avgStakeCents := safeRatio(totalStakeCents, placedCount)

	churnScore := clampScore(daysSinceActivity*2.4 + safeRatio(14, placedCount+1)*6)
	ltvScore := clampScore(12 + math.Log10(totalStakeCents+1)*18 + math.Log10(depositCents+1)*16 + settledCount*1.8)
	riskScore := clampScore(cancelRatio*100*0.55 + safeRatio(avgStakeCents, 1000)*4 + float64(features.PendingReviewCount)*12)
	if currentBalanceCents < 0 {
		riskScore = clampScore(riskScore + 20)
	}
	if daysSinceActivity > 45 {
		riskScore = clampScore(riskScore + safeRatio(daysSinceActivity-45, 2))
	}

	return models.RiskPlayerScore{
		UserID:       features.UserID,
		ChurnScore:   roundToSingleDecimal(churnScore),
		LTVScore:     roundToSingleDecimal(ltvScore),
		RiskScore:    roundToSingleDecimal(riskScore),
		ModelVersion: riskModelVersion,
		GeneratedAt:  now.UTC(),
	}
}

func buildRiskSegmentProfile(score models.RiskPlayerScore, features models.RiskFeatureSnapshot, now time.Time) models.RiskSegmentProfile {
	segmentID := "core"
	segmentReason := "stable activity profile"

	switch {
	case features.PendingReviewCount > 0 || features.CurrentBalance.LessThan(decimal.Zero):
		segmentID = "watchlist"
		segmentReason = "payment review or balance anomaly requires attention"
	case score.RiskScore >= 75:
		segmentID = "high-risk"
		segmentReason = "elevated operational risk score"
	case score.ChurnScore >= 70:
		segmentID = "churn-risk"
		segmentReason = "recent activity has dropped materially"
	case score.LTVScore >= 75:
		segmentID = "vip"
		segmentReason = "high lifetime value profile"
	case features.SportsbookPlacedCount+features.PredictionPlacedCount <= 2:
		segmentID = "new"
		segmentReason = "limited transaction history"
	}

	return models.RiskSegmentProfile{
		UserID:            score.UserID,
		SegmentID:         segmentID,
		SegmentReason:     segmentReason,
		RiskScore:         score.RiskScore,
		HasManualOverride: false,
		GeneratedAt:       now.UTC(),
	}
}

func safeRatio(numerator, denominator float64) float64 {
	if denominator == 0 {
		return 0
	}
	return numerator / denominator
}

func clampScore(value float64) float64 {
	switch {
	case value < 0:
		return 0
	case value > 100:
		return 100
	default:
		return value
	}
}

func roundToSingleDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}
