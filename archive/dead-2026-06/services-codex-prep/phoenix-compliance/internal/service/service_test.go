package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-compliance/internal/models"
	"github.com/phoenixbot/phoenix-compliance/internal/repository"
)

type fakeRepo struct {
	setLimitCalls []models.SetLimitRequest
	lastSetActor  string
	lastSetUser   string

	createSelfExclusionCalls int
	lastCreateActorID        string
	lastCreateUserID         string
	lastCreateRequest        models.SelfExcludeRequest

	disableActiveCoolOffCalls int
	lastDisableActorID        string
	lastDisableUserID         string
	lastDisableReason         string
	disableActiveCoolOffErr   error
}

func (f *fakeRepo) SetLimit(ctx context.Context, actorID, userID string, req models.SetLimitRequest) (*models.Limit, error) {
	f.lastSetActor = actorID
	f.lastSetUser = userID
	f.setLimitCalls = append(f.setLimitCalls, req)
	return &models.Limit{UserID: userID, LimitType: req.LimitType, LimitAmount: req.LimitAmount}, nil
}
func (f *fakeRepo) GetLimits(ctx context.Context, userID string) (*models.LimitsResponse, error) {
	return &models.LimitsResponse{UserID: userID}, nil
}
func (f *fakeRepo) GetLimitHistory(ctx context.Context, userID string, page, itemsPerPage int) (*models.LimitHistoryResponse, error) {
	return &models.LimitHistoryResponse{Data: []models.LimitHistoryEntry{}, ItemsPerPage: itemsPerPage}, nil
}
func (f *fakeRepo) CreateSelfExclusion(ctx context.Context, actorID, userID string, req models.SelfExcludeRequest) (*models.SelfExclusion, error) {
	f.createSelfExclusionCalls++
	f.lastCreateActorID = actorID
	f.lastCreateUserID = userID
	f.lastCreateRequest = req
	return &models.SelfExclusion{UserID: userID, ExclusionType: req.ExclusionType, Status: "active"}, nil
}
func (f *fakeRepo) DisableActiveCoolOff(ctx context.Context, actorID, userID, reason string) (*models.SelfExclusion, error) {
	f.disableActiveCoolOffCalls++
	f.lastDisableActorID = actorID
	f.lastDisableUserID = userID
	f.lastDisableReason = reason
	if f.disableActiveCoolOffErr != nil {
		return nil, f.disableActiveCoolOffErr
	}
	return &models.SelfExclusion{UserID: userID, ExclusionType: "temporary", Status: "cancelled"}, nil
}
func (f *fakeRepo) GetCoolOffHistory(ctx context.Context, userID string, page, itemsPerPage int) (*models.CoolOffHistoryResponse, error) {
	return &models.CoolOffHistoryResponse{Data: []models.CoolOffHistoryEntry{}, ItemsPerPage: itemsPerPage}, nil
}
func (f *fakeRepo) AcceptResponsibilityCheck(ctx context.Context, actorID, userID string) (*models.ResponsibilityCheckAcceptance, error) {
	return &models.ResponsibilityCheckAcceptance{UserID: userID, AcceptedAt: time.Now().UTC()}, nil
}
func (f *fakeRepo) GetRestrictions(ctx context.Context, userID string) (*models.RestrictionsResponse, error) {
	return &models.RestrictionsResponse{UserID: userID}, nil
}
func (f *fakeRepo) CreateAMLCheck(ctx context.Context, actorID string, req models.AMLCheckRequest) (*models.AMLCheck, error) {
	return &models.AMLCheck{CheckID: "aml_1", UserID: req.UserID, Status: "in_progress"}, nil
}
func (f *fakeRepo) GetAMLCheck(ctx context.Context, checkID string) (*models.AMLCheck, error) {
	return &models.AMLCheck{CheckID: checkID, UserID: "u1", Status: "completed"}, nil
}
func (f *fakeRepo) CreateComplianceAlert(ctx context.Context, actorID string, req models.ComplianceAlertRequest) (*models.ComplianceAlert, error) {
	return &models.ComplianceAlert{AlertID: "alr_1", Status: "open", CreatedAt: time.Now().UTC()}, nil
}

func TestSetLimitRequiresOwnershipOrAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.SetLimit(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2", &models.SetLimitRequest{LimitType: "daily_loss", LimitAmount: decimal.NewFromInt(100), Currency: "USD"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestSetLimitAllowsAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.SetLimit(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, "u2", &models.SetLimitRequest{LimitType: "daily_loss", LimitAmount: decimal.NewFromInt(100), Currency: "USD"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}

func TestSetAdminLegacyLimitAllowsOperatorAndFansOutDepositPeriods(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, GeoComplyConfig{LicenseKey: "demo"})
	daily := decimal.NewFromInt(100)
	weekly := decimal.NewFromInt(250)
	monthly := decimal.NewFromInt(500)

	response, err := svc.SetAdminLegacyLimit(context.Background(), models.AuthClaims{UserID: "op-1", Role: "operator"}, "u2", "deposit", &models.LegacySetLimitsRequest{
		Daily:   &daily,
		Weekly:  &weekly,
		Monthly: &monthly,
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response == nil || !response.Success || len(response.Limits) != 3 {
		t.Fatalf("unexpected response %+v", response)
	}
	if repo.lastSetActor != "op-1" || repo.lastSetUser != "u2" {
		t.Fatalf("unexpected actor/user propagation: actor=%s user=%s", repo.lastSetActor, repo.lastSetUser)
	}
	if len(repo.setLimitCalls) != 3 {
		t.Fatalf("expected 3 set limit calls, got %d", len(repo.setLimitCalls))
	}
	wantTypes := []string{"daily_deposit", "weekly_deposit", "monthly_deposit"}
	for index, wantType := range wantTypes {
		if repo.setLimitCalls[index].LimitType != wantType {
			t.Fatalf("call %d limit type = %s, want %s", index, repo.setLimitCalls[index].LimitType, wantType)
		}
		if repo.setLimitCalls[index].Currency != "USD" {
			t.Fatalf("call %d currency = %s, want USD", index, repo.setLimitCalls[index].Currency)
		}
		if !repo.setLimitCalls[index].LimitAmount.Equal([]decimal.Decimal{daily, weekly, monthly}[index]) {
			t.Fatalf("call %d amount = %s", index, repo.setLimitCalls[index].LimitAmount)
		}
	}
}

func TestSetAdminLegacyLimitAllowsSessionLimitsAndFansOutPeriods(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, GeoComplyConfig{LicenseKey: "demo"})
	daily := decimal.NewFromInt(1)
	weekly := decimal.NewFromInt(2)
	monthly := decimal.NewFromInt(3)

	response, err := svc.SetAdminLegacyLimit(context.Background(), models.AuthClaims{UserID: "op-1", Role: "operator"}, "u2", "session", &models.LegacySetLimitsRequest{
		DailyLimit:   &daily,
		WeeklyLimit:  &weekly,
		MonthlyLimit: &monthly,
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response == nil || !response.Success || len(response.Limits) != 3 {
		t.Fatalf("unexpected response %+v", response)
	}
	if len(repo.setLimitCalls) != 3 {
		t.Fatalf("expected 3 set limit calls, got %d", len(repo.setLimitCalls))
	}
	wantTypes := []string{"daily_session", "weekly_session", "monthly_session"}
	for index, wantType := range wantTypes {
		if repo.setLimitCalls[index].LimitType != wantType {
			t.Fatalf("call %d limit type = %s, want %s", index, repo.setLimitCalls[index].LimitType, wantType)
		}
	}
}

func TestSetLegacyLimitsRejectsInvalidOrdering(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, GeoComplyConfig{LicenseKey: "demo"})
	daily := decimal.NewFromInt(5)
	weekly := decimal.NewFromInt(4)

	_, err := svc.SetLegacyLimits(context.Background(), models.AuthClaims{UserID: "u2", Role: "user"}, "u2", "deposit", &models.LegacySetLimitsRequest{
		DailyLimit:  &daily,
		WeeklyLimit: &weekly,
	})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
	if len(repo.setLimitCalls) != 0 {
		t.Fatalf("did not expect repository writes")
	}
}

func TestCreateAMLCheckRequiresOperator(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.CreateAMLCheck(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, &models.AMLCheckRequest{UserID: "u2", FullName: "John Doe", DateOfBirth: time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC), Country: "US"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateAMLCheckAllowsOperator(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.CreateAMLCheck(context.Background(), models.AuthClaims{UserID: "u1", Role: "operator"}, &models.AMLCheckRequest{UserID: "u2", FullName: "John Doe", DateOfBirth: time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC), Country: "US"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}

func TestCreateComplianceAlertRequiresSystemOrAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.CreateComplianceAlert(context.Background(), models.AuthClaims{UserID: "u1", Role: "operator"}, &models.ComplianceAlertRequest{AlertType: "unusual_activity", Description: "desc", Severity: "high"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestAcceptResponsibilityCheckRequiresOwnershipOrAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.AcceptResponsibilityCheck(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2")
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGetLimitHistoryRequiresOwnershipOrAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.GetLimitHistory(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2", 1, 10)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGetAdminLimitHistoryAllowsOperatorAndMapsLegacyEnums(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	response, err := svc.GetAdminLimitHistory(context.Background(), models.AuthClaims{UserID: "op-1", Role: "operator"}, "u2", 1, 10)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.CurrentPage != 1 || response.ItemsPerPage != 10 {
		t.Fatalf("unexpected pagination: %+v", response)
	}
}

func TestGetCoolOffHistoryDefaultsPagination(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	response, err := svc.GetCoolOffHistory(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u1", 0, 0)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.ItemsPerPage != 10 {
		t.Fatalf("expected default page size 10, got %d", response.ItemsPerPage)
	}
}

func TestGetAdminCoolOffHistoryRejectsUnauthorizedRole(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.GetAdminCoolOffHistory(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2", 1, 10)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateAdminCoolOffRejectsUnauthorizedRole(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.CreateAdminCoolOff(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2", &models.AdminLifecycleRequest{Enable: true})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateAdminCoolOffDisablesActiveCoolOffWhenRequested(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, GeoComplyConfig{LicenseKey: "demo"})
	response, err := svc.CreateAdminCoolOff(context.Background(), models.AuthClaims{UserID: "op-1", Role: "operator"}, "u2", &models.AdminLifecycleRequest{Enable: false, Reason: "manual_reset"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response == nil || response.Status != "cancelled" {
		t.Fatalf("unexpected response %+v", response)
	}
	if repo.disableActiveCoolOffCalls != 1 || repo.createSelfExclusionCalls != 0 {
		t.Fatalf("unexpected repository calls: disable=%d create=%d", repo.disableActiveCoolOffCalls, repo.createSelfExclusionCalls)
	}
	if repo.lastDisableActorID != "op-1" || repo.lastDisableUserID != "u2" || repo.lastDisableReason != "manual_reset" {
		t.Fatalf("unexpected disable arguments: actor=%s user=%s reason=%s", repo.lastDisableActorID, repo.lastDisableUserID, repo.lastDisableReason)
	}
}

func TestCreateAdminCoolOffAllowsOperator(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, GeoComplyConfig{LicenseKey: "demo"})
	response, err := svc.CreateAdminCoolOff(context.Background(), models.AuthClaims{UserID: "op-1", Role: "operator"}, "u2", &models.AdminLifecycleRequest{Enable: true, Reason: "Operator action"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response == nil || response.ExclusionType != "temporary" {
		t.Fatalf("unexpected response %+v", response)
	}
	if repo.createSelfExclusionCalls != 1 || repo.disableActiveCoolOffCalls != 0 {
		t.Fatalf("unexpected repository calls: create=%d disable=%d", repo.createSelfExclusionCalls, repo.disableActiveCoolOffCalls)
	}
	if repo.lastCreateActorID != "op-1" || repo.lastCreateUserID != "u2" {
		t.Fatalf("unexpected create arguments: actor=%s user=%s", repo.lastCreateActorID, repo.lastCreateUserID)
	}
	if repo.lastCreateRequest.ExclusionType != "temporary" || repo.lastCreateRequest.Reason != "Operator action" {
		t.Fatalf("unexpected create request: %+v", repo.lastCreateRequest)
	}
}

func TestCreateAdminCoolOffDisablePropagatesNotFound(t *testing.T) {
	repo := &fakeRepo{disableActiveCoolOffErr: repository.ErrNotFound}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, GeoComplyConfig{LicenseKey: "demo"})
	_, err := svc.CreateAdminCoolOff(context.Background(), models.AuthClaims{UserID: "op-1", Role: "operator"}, "u2", &models.AdminLifecycleRequest{Enable: false})
	if err == nil || !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}

func TestGetGeoComplyLicenseRequiresConfiguredLicense(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{})
	_, err := svc.GetGeoComplyLicense(context.Background())
	if err == nil || !errors.Is(err, ErrGeoComplyLicenseKeysNotFound) {
		t.Fatalf("expected license not found, got %v", err)
	}
}

func TestEvaluateGeoPacketPassesByDefault(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo", AnotherGeolocationInSecs: 123})
	response, err := svc.EvaluateGeoPacket(context.Background(), &models.GeoComplyPacketRequest{EncryptedString: "opaque-packet"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.Result != "PASSED" || response.AnotherGeolocationInSeconds != 123 {
		t.Fatalf("unexpected response: %+v", response)
	}
}

func TestEvaluateGeoPacketRejectsWhenConfigured(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, GeoComplyConfig{LicenseKey: "demo", ResultMode: "reject", RejectCode: "OUT_OF_BOUNDARY", RejectMessage: "Rejected"})
	response, err := svc.EvaluateGeoPacket(context.Background(), &models.GeoComplyPacketRequest{EncryptedString: "opaque-packet"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response.Result != "REJECTED" || len(response.Errors) != 1 || response.Errors[0] != "OUT_OF_BOUNDARY" {
		t.Fatalf("unexpected response: %+v", response)
	}
}
