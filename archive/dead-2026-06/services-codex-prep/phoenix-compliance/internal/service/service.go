package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-compliance/internal/models"
	"github.com/phoenixbot/phoenix-compliance/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

var (
	ErrGeoComplyLicenseKeysNotFound = errors.New("geoComplyLicenseKeysNotFound")
	ErrFailedToDecryptGeoPacket     = errors.New("failedToDecryptGeoPacket")
	ErrFailedToParseGeoPacket       = errors.New("failedToParseGeoPacket")
)

type GeoComplyConfig struct {
	LicenseKey               string
	ResultMode               string
	AnotherGeolocationInSecs int
	RejectCode               string
	RejectMessage            string
}

type Service interface {
	SetLimit(ctx context.Context, actor models.AuthClaims, userID string, req *models.SetLimitRequest) (*models.Limit, error)
	SetLegacyLimits(ctx context.Context, actor models.AuthClaims, userID, limitKind string, req *models.LegacySetLimitsRequest) (*models.LegacySetLimitsResponse, error)
	SetAdminLegacyLimit(ctx context.Context, actor models.AuthClaims, userID, limitKind string, req *models.LegacySetLimitsRequest) (*models.LegacySetLimitsResponse, error)
	GetLimits(ctx context.Context, actor models.AuthClaims, userID string) (*models.LimitsResponse, error)
	GetLimitHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.LimitHistoryResponse, error)
	GetAdminLimitHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.AdminLimitHistoryResponse, error)
	CreateSelfExclusion(ctx context.Context, actor models.AuthClaims, userID string, req *models.SelfExcludeRequest) (*models.SelfExclusion, error)
	CreateAdminCoolOff(ctx context.Context, actor models.AuthClaims, userID string, req *models.AdminLifecycleRequest) (*models.SelfExclusion, error)
	GetCoolOffHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.CoolOffHistoryResponse, error)
	GetAdminCoolOffHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.AdminCoolOffHistoryResponse, error)
	AcceptResponsibilityCheck(ctx context.Context, actor models.AuthClaims, userID string) (*models.ResponsibilityCheckAcceptance, error)
	GetRestrictions(ctx context.Context, actor models.AuthClaims, userID string) (*models.RestrictionsResponse, error)
	CreateAMLCheck(ctx context.Context, actor models.AuthClaims, req *models.AMLCheckRequest) (*models.AMLCheck, error)
	GetAMLCheck(ctx context.Context, actor models.AuthClaims, checkID string) (*models.AMLCheck, error)
	CreateComplianceAlert(ctx context.Context, actor models.AuthClaims, req *models.ComplianceAlertRequest) (*models.ComplianceAlert, error)
	GetGeoComplyLicense(ctx context.Context) (*models.GeoComplyLicenseResponse, error)
	EvaluateGeoPacket(ctx context.Context, req *models.GeoComplyPacketRequest) (*models.GeoComplyPacketResponse, error)
}

type complianceService struct {
	logger *slog.Logger
	repo   repository.Repository
	geo    GeoComplyConfig
}

func NewService(logger *slog.Logger, repo repository.Repository, geo GeoComplyConfig) Service {
	if geo.AnotherGeolocationInSecs <= 0 {
		geo.AnotherGeolocationInSecs = 1800
	}
	if strings.TrimSpace(geo.ResultMode) == "" {
		geo.ResultMode = "pass"
	}
	if strings.TrimSpace(geo.RejectCode) == "" {
		geo.RejectCode = "OUT_OF_BOUNDARY"
	}
	if strings.TrimSpace(geo.RejectMessage) == "" {
		geo.RejectMessage = "Location check failed"
	}
	return &complianceService{logger: logger, repo: repo, geo: geo}
}

func (s *complianceService) SetLimit(ctx context.Context, actor models.AuthClaims, userID string, req *models.SetLimitRequest) (*models.Limit, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.LimitType = strings.TrimSpace(req.LimitType)
	req.Currency = strings.ToUpper(strings.TrimSpace(req.Currency))
	if req.LimitType == "" || req.Currency == "" || !req.LimitAmount.GreaterThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("%w: invalid limit payload", ErrInvalidInput)
	}
	if req.EffectiveDate.IsZero() {
		req.EffectiveDate = time.Now().UTC()
	}
	return s.repo.SetLimit(ctx, actor.UserID, userID, *req)
}

func (s *complianceService) SetLegacyLimits(ctx context.Context, actor models.AuthClaims, userID, limitKind string, req *models.LegacySetLimitsRequest) (*models.LegacySetLimitsResponse, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.applyLegacyLimits(ctx, actor.UserID, userID, limitKind, req)
}

func (s *complianceService) SetAdminLegacyLimit(ctx context.Context, actor models.AuthClaims, userID, limitKind string, req *models.LegacySetLimitsRequest) (*models.LegacySetLimitsResponse, error) {
	if !canReviewUserCompliance(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.applyLegacyLimits(ctx, actor.UserID, userID, limitKind, req)
}

func (s *complianceService) GetLimits(ctx context.Context, actor models.AuthClaims, userID string) (*models.LimitsResponse, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetLimits(ctx, userID)
}

func (s *complianceService) GetLimitHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.LimitHistoryResponse, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if page <= 0 {
		page = 1
	}
	if itemsPerPage <= 0 {
		itemsPerPage = 10
	}
	return s.repo.GetLimitHistory(ctx, userID, page, itemsPerPage)
}

func (s *complianceService) GetAdminLimitHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.AdminLimitHistoryResponse, error) {
	if !canReviewUserCompliance(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if page <= 0 {
		page = 1
	}
	if itemsPerPage <= 0 {
		itemsPerPage = 10
	}
	response, err := s.repo.GetLimitHistory(ctx, userID, page, itemsPerPage)
	if err != nil {
		return nil, err
	}
	items := make([]models.AdminLimitHistoryEntry, 0, len(response.Data))
	for _, item := range response.Data {
		items = append(items, models.AdminLimitHistoryEntry{
			Period:        normalizeAdminLimitPeriod(item.Period),
			Limit:         item.Limit,
			EffectiveFrom: item.EffectiveFrom,
			LimitType:     normalizeAdminLimitType(item.LimitType),
			RequestedAt:   item.RequestedAt,
		})
	}
	return &models.AdminLimitHistoryResponse{
		Data:         items,
		CurrentPage:  page,
		ItemsPerPage: response.ItemsPerPage,
		TotalCount:   response.TotalCount,
	}, nil
}

func (s *complianceService) CreateSelfExclusion(ctx context.Context, actor models.AuthClaims, userID string, req *models.SelfExcludeRequest) (*models.SelfExclusion, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.ExclusionType = strings.TrimSpace(req.ExclusionType)
	req.Reason = strings.TrimSpace(req.Reason)
	if req.ExclusionType == "" || req.Reason == "" {
		return nil, fmt.Errorf("%w: exclusion_type and reason are required", ErrInvalidInput)
	}
	return s.repo.CreateSelfExclusion(ctx, actor.UserID, userID, *req)
}

func (s *complianceService) CreateAdminCoolOff(ctx context.Context, actor models.AuthClaims, userID string, req *models.AdminLifecycleRequest) (*models.SelfExclusion, error) {
	if !canReviewUserCompliance(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = "operator_action"
	}
	if !req.Enable {
		return s.repo.DisableActiveCoolOff(ctx, actor.UserID, userID, reason)
	}
	return s.repo.CreateSelfExclusion(ctx, actor.UserID, userID, models.SelfExcludeRequest{
		ExclusionType: "temporary",
		Reason:        reason,
	})
}

func (s *complianceService) GetCoolOffHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.CoolOffHistoryResponse, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if page <= 0 {
		page = 1
	}
	if itemsPerPage <= 0 {
		itemsPerPage = 10
	}
	return s.repo.GetCoolOffHistory(ctx, userID, page, itemsPerPage)
}

func (s *complianceService) GetAdminCoolOffHistory(ctx context.Context, actor models.AuthClaims, userID string, page, itemsPerPage int) (*models.AdminCoolOffHistoryResponse, error) {
	if !canReviewUserCompliance(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if page <= 0 {
		page = 1
	}
	if itemsPerPage <= 0 {
		itemsPerPage = 10
	}
	response, err := s.repo.GetCoolOffHistory(ctx, userID, page, itemsPerPage)
	if err != nil {
		return nil, err
	}
	items := make([]models.AdminCoolOffHistoryEntry, 0, len(response.Data))
	for _, item := range response.Data {
		items = append(items, models.AdminCoolOffHistoryEntry{
			PunterID:     userID,
			CoolOffStart: item.CoolOffStart,
			CoolOffEnd:   item.CoolOffEnd,
			CoolOffCause: normalizeAdminCoolOffCause(item.Reason),
		})
	}
	return &models.AdminCoolOffHistoryResponse{
		Data:         items,
		CurrentPage:  page,
		ItemsPerPage: response.ItemsPerPage,
		TotalCount:   response.TotalCount,
	}, nil
}

func (s *complianceService) AcceptResponsibilityCheck(ctx context.Context, actor models.AuthClaims, userID string) (*models.ResponsibilityCheckAcceptance, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.AcceptResponsibilityCheck(ctx, actor.UserID, userID)
}

func (s *complianceService) GetRestrictions(ctx context.Context, actor models.AuthClaims, userID string) (*models.RestrictionsResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetRestrictions(ctx, userID)
}

func (s *complianceService) CreateAMLCheck(ctx context.Context, actor models.AuthClaims, req *models.AMLCheckRequest) (*models.AMLCheck, error) {
	if !canRunAML(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.UserID = strings.TrimSpace(req.UserID)
	req.FullName = strings.TrimSpace(req.FullName)
	req.Country = strings.ToUpper(strings.TrimSpace(req.Country))
	if req.UserID == "" || req.FullName == "" || req.Country == "" || req.DateOfBirth.IsZero() {
		return nil, fmt.Errorf("%w: invalid aml check payload", ErrInvalidInput)
	}
	return s.repo.CreateAMLCheck(ctx, actor.UserID, *req)
}

func (s *complianceService) GetAMLCheck(ctx context.Context, actor models.AuthClaims, checkID string) (*models.AMLCheck, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetAMLCheck(ctx, strings.TrimSpace(checkID))
}

func (s *complianceService) CreateComplianceAlert(ctx context.Context, actor models.AuthClaims, req *models.ComplianceAlertRequest) (*models.ComplianceAlert, error) {
	if !canCreateAlert(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.AlertType = strings.TrimSpace(req.AlertType)
	req.UserID = strings.TrimSpace(req.UserID)
	req.Description = strings.TrimSpace(req.Description)
	req.Severity = strings.TrimSpace(req.Severity)
	if req.AlertType == "" || req.Description == "" || req.Severity == "" {
		return nil, fmt.Errorf("%w: invalid compliance alert payload", ErrInvalidInput)
	}
	return s.repo.CreateComplianceAlert(ctx, actor.UserID, *req)
}

func (s *complianceService) applyLegacyLimits(ctx context.Context, actorID, userID, limitKind string, req *models.LegacySetLimitsRequest) (*models.LegacySetLimitsResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}

	normalizedKind, currency, err := legacyLimitConfig(limitKind)
	if err != nil {
		return nil, err
	}

	values := map[string]decimal.Decimal{}
	if amount, ok := firstProvidedDecimal(req.DailyLimit, req.Daily); ok {
		values["daily"] = amount.Round(2)
	}
	if amount, ok := firstProvidedDecimal(req.WeeklyLimit, req.Weekly); ok {
		values["weekly"] = amount.Round(2)
	}
	if amount, ok := firstProvidedDecimal(req.MonthlyLimit, req.Monthly); ok {
		values["monthly"] = amount.Round(2)
	}
	if len(values) == 0 {
		return nil, fmt.Errorf("%w: at least one limit value is required", ErrInvalidInput)
	}
	for period, value := range values {
		if value.LessThan(decimal.Zero) {
			return nil, fmt.Errorf("%w: %s must be greater than or equal to zero", ErrInvalidInput, period)
		}
	}
	if daily, ok := values["daily"]; ok {
		if weekly, exists := values["weekly"]; exists && daily.GreaterThan(weekly) {
			return nil, fmt.Errorf("%w: daily limit cannot exceed weekly limit", ErrInvalidInput)
		}
		if monthly, exists := values["monthly"]; exists && daily.GreaterThan(monthly) {
			return nil, fmt.Errorf("%w: daily limit cannot exceed monthly limit", ErrInvalidInput)
		}
	}
	if weekly, ok := values["weekly"]; ok {
		if monthly, exists := values["monthly"]; exists && weekly.GreaterThan(monthly) {
			return nil, fmt.Errorf("%w: weekly limit cannot exceed monthly limit", ErrInvalidInput)
		}
	}

	effectiveAt := time.Now().UTC()
	applied := make([]models.Limit, 0, len(values))
	for _, period := range []string{"daily", "weekly", "monthly"} {
		value, ok := values[period]
		if !ok {
			continue
		}
		limit, err := s.repo.SetLimit(ctx, actorID, userID, models.SetLimitRequest{
			LimitType:     period + "_" + normalizedKind,
			LimitAmount:   value,
			Currency:      currency,
			EffectiveDate: effectiveAt,
		})
		if err != nil {
			return nil, err
		}
		applied = append(applied, *limit)
	}

	return &models.LegacySetLimitsResponse{
		Success: true,
		Limits:  applied,
	}, nil
}

func ownsOrAdmin(actor models.AuthClaims, userID string) bool {
	return actor.UserID == userID || isAdmin(actor.Role)
}

func isAdmin(role string) bool {
	return normalizeRole(role) == "admin"
}

func canRunAML(role string) bool {
	normalized := normalizeRole(role)
	return normalized == "operator" || normalized == "admin"
}

func canReviewUserCompliance(role string) bool {
	normalized := normalizeRole(role)
	return normalized == "admin" || normalized == "operator" || normalized == "trader"
}

func canCreateAlert(role string) bool {
	normalized := normalizeRole(role)
	return normalized == "system" || normalized == "admin"
}

func normalizeRole(role string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
}

func normalizeAdminLimitPeriod(period string) string {
	switch strings.ToUpper(strings.TrimSpace(period)) {
	case "DAILY":
		return "DAY"
	case "WEEKLY":
		return "WEEK"
	case "MONTHLY":
		return "MONTH"
	default:
		return strings.ToUpper(strings.TrimSpace(period))
	}
}

func normalizeAdminLimitType(limitType string) string {
	switch strings.ToUpper(strings.TrimSpace(limitType)) {
	case "DEPOSIT":
		return "DEPOSIT_AMOUNT"
	case "STAKE":
		return "STAKE_AMOUNT"
	case "SESSIONTIME", "SESSION_TIME":
		return "SESSION_TIME"
	default:
		return strings.ToUpper(strings.TrimSpace(limitType))
	}
}

func normalizeAdminCoolOffCause(reason string) string {
	switch strings.ToLower(strings.TrimSpace(reason)) {
	case "session_limit_breach", "session-limit-breach", "session limit breach":
		return "SESSION_LIMIT_BREACH"
	default:
		return "SELF_INITIATED"
	}
}

func legacyLimitConfig(limitKind string) (string, string, error) {
	switch strings.ToLower(strings.TrimSpace(limitKind)) {
	case "deposit", "deposits":
		return "deposit", "USD", nil
	case "stake", "losses":
		return "stake", "USD", nil
	case "session":
		return "session", "USD", nil
	default:
		return "", "", fmt.Errorf("%w: unsupported legacy limit kind %q", ErrInvalidInput, strings.TrimSpace(limitKind))
	}
}

func firstProvidedDecimal(values ...*decimal.Decimal) (decimal.Decimal, bool) {
	for _, value := range values {
		if value != nil {
			return *value, true
		}
	}
	return decimal.Decimal{}, false
}

func (s *complianceService) GetGeoComplyLicense(_ context.Context) (*models.GeoComplyLicenseResponse, error) {
	license := strings.TrimSpace(s.geo.LicenseKey)
	if license == "" {
		return nil, ErrGeoComplyLicenseKeysNotFound
	}
	return &models.GeoComplyLicenseResponse{Value: license}, nil
}

func (s *complianceService) EvaluateGeoPacket(_ context.Context, req *models.GeoComplyPacketRequest) (*models.GeoComplyPacketResponse, error) {
	if req == nil {
		return nil, ErrFailedToParseGeoPacket
	}
	packet := strings.TrimSpace(req.EncryptedString)
	if packet == "" {
		return nil, ErrFailedToDecryptGeoPacket
	}

	mode := strings.ToLower(strings.TrimSpace(s.geo.ResultMode))
	if strings.Contains(strings.ToLower(packet), "reject") || mode == "reject" {
		return &models.GeoComplyPacketResponse{
			Result: "REJECTED",
			Errors: []string{strings.ToUpper(strings.TrimSpace(s.geo.RejectCode))},
			Reasons: []models.GeoComplyTroubleshooterReason{{
				Retry:   false,
				Message: strings.TrimSpace(s.geo.RejectMessage),
			}},
		}, nil
	}

	return &models.GeoComplyPacketResponse{
		Result:                      "PASSED",
		AnotherGeolocationInSeconds: s.geo.AnotherGeolocationInSecs,
	}, nil
}
