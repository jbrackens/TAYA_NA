package compliance

import (
	"context"
	"testing"
)

func TestMockGeoComplianceServiceUsesConfiguredApprovedCountries(t *testing.T) {
	t.Setenv("COMPLIANCE_GEO_APPROVED_COUNTRIES", "US,MT")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_MODE", "")

	service := NewMockGeoComplianceServiceFromEnv()

	approved, err := service.IsLocationApproved(context.Background(), "MT", "")
	if err != nil {
		t.Fatalf("IsLocationApproved returned error: %v", err)
	}
	if !approved {
		t.Fatalf("expected MT to be approved from env configuration")
	}
}

func TestMockGeoComplianceServiceSandboxModeApprovesAnyLocation(t *testing.T) {
	t.Setenv("COMPLIANCE_GEO_SANDBOX_MODE", "true")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_COUNTRY", "MT")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_STATE", "MT-LOCAL")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_CITY", "Valletta")

	service := NewMockGeoComplianceServiceFromEnv()

	result, err := service.VerifyLocation(context.Background(), "u-1", 35.8997, 14.5146)
	if err != nil {
		t.Fatalf("VerifyLocation returned error: %v", err)
	}
	if result.Status != "approved" {
		t.Fatalf("expected sandbox result approved, got %s", result.Status)
	}
	if result.Country != "MT" {
		t.Fatalf("expected sandbox country MT, got %s", result.Country)
	}
	if result.State != "MT-LOCAL" {
		t.Fatalf("expected sandbox state MT-LOCAL, got %s", result.State)
	}
	if result.City != "Valletta" {
		t.Fatalf("expected sandbox city Valletta, got %s", result.City)
	}
}

func TestMockResponsibleGamblingServiceDepositLimitTracksUsage(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetDepositLimit(ctx, "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetDepositLimit returned error: %v", err)
	}
	if err := service.RecordDeposit(ctx, "u-1", 100); err != nil {
		t.Fatalf("RecordDeposit returned error: %v", err)
	}

	limits, err := service.GetDepositLimits(ctx, "u-1")
	if err != nil {
		t.Fatalf("GetDepositLimits returned error: %v", err)
	}
	if len(limits) != 1 {
		t.Fatalf("expected 1 deposit limit, got %d", len(limits))
	}
	if limits[0].UsedCents != 100 {
		t.Fatalf("expected used cents 100, got %d", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 900 {
		t.Fatalf("expected remaining cents 900, got %d", limits[0].RemainingCents)
	}

	allowed, _, err := service.CheckDepositAllowed(ctx, "u-1", 901)
	if allowed {
		t.Fatal("expected deposit above remaining limit to be rejected")
	}
	if err != ErrDepositLimitExceeded {
		t.Fatalf("expected ErrDepositLimitExceeded, got %v", err)
	}
}

func TestMockResponsibleGamblingServiceBetLimitTracksUsage(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetBetLimit(ctx, "u-1", "daily", 500); err != nil {
		t.Fatalf("SetBetLimit returned error: %v", err)
	}
	if err := service.RecordBet(ctx, "u-1", 125); err != nil {
		t.Fatalf("RecordBet returned error: %v", err)
	}

	limits, err := service.GetBetLimits(ctx, "u-1")
	if err != nil {
		t.Fatalf("GetBetLimits returned error: %v", err)
	}
	if len(limits) != 1 {
		t.Fatalf("expected 1 bet limit, got %d", len(limits))
	}
	if limits[0].UsedCents != 125 {
		t.Fatalf("expected used cents 125, got %d", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 375 {
		t.Fatalf("expected remaining cents 375, got %d", limits[0].RemainingCents)
	}

	allowed, _, err := service.CheckBetAllowed(ctx, "u-1", 376)
	if allowed {
		t.Fatal("expected bet above remaining limit to be rejected")
	}
	if err != ErrBetLimitExceeded {
		t.Fatalf("expected ErrBetLimitExceeded, got %v", err)
	}
}
