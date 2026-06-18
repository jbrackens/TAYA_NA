package bonus

import (
	"context"
	"encoding/json"
	"math"
	"testing"
	"time"
)

func TestComputeWageringRequired_ZeroMultiplier(t *testing.T) {
	if got := computeWageringRequired(10000, 0); got != 0 {
		t.Fatalf("expected 0 wagering for zero multiplier, got %d", got)
	}
	if got := computeWageringRequired(10000, -5); got != 0 {
		t.Fatalf("expected 0 wagering for negative multiplier, got %d", got)
	}
}

func TestComputeWageringRequired_Normal(t *testing.T) {
	if got := computeWageringRequired(10000, 10); got != 100000 {
		t.Fatalf("expected 100000 (10x of 10000), got %d", got)
	}
}

func TestComputeWageringRequired_ClampsAbsurdMultiplier(t *testing.T) {
	// A caller-supplied multiplier above the ceiling must clamp, not overflow.
	got := computeWageringRequired(maxBonusAmountCents, math.MaxFloat64)
	if got < 0 {
		t.Fatalf("wagering requirement overflowed to negative: %d", got)
	}
	want := maxBonusAmountCents * int64(maxWageringMultiplier)
	if got != want {
		t.Fatalf("expected clamp to %d, got %d", want, got)
	}
}

func TestComputeWageringRequired_NoInt64Overflow(t *testing.T) {
	// Max bounded amount * max bounded multiplier must stay well within int64.
	got := computeWageringRequired(maxBonusAmountCents, maxWageringMultiplier)
	if got <= 0 {
		t.Fatalf("expected positive bounded wagering requirement, got %d", got)
	}
	if got > math.MaxInt64/2 {
		t.Fatalf("bounded wagering requirement unexpectedly large: %d", got)
	}
}

func mustRuleConfig(t *testing.T, v any) json.RawMessage {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal rule config: %v", err)
	}
	return b
}

func baseCampaignReq() CreateCampaignRequest {
	return CreateCampaignRequest{
		Name:         "Test",
		CampaignType: "signup_bonus",
		StartAt:      time.Now().UTC(),
		EndAt:        time.Now().UTC().Add(24 * time.Hour),
		CreatedBy:    "tester",
	}
}

// CreateCampaign validation runs before any DB access, so a nil-repo service is
// sufficient to exercise the rejection paths.
func newValidationOnlyService() *Service {
	return NewService(NewRepository(nil), nil, nil)
}

func TestCreateCampaign_RejectsAbsurdMultiplier(t *testing.T) {
	svc := newValidationOnlyService()
	req := baseCampaignReq()
	req.Rules = []RuleInput{
		{RuleType: "wagering", RuleConfig: mustRuleConfig(t, map[string]any{"multiplier": 1e12})},
	}
	if _, err := svc.CreateCampaign(context.Background(), req); err == nil {
		t.Fatal("expected rejection of out-of-range wagering multiplier")
	}
}

func TestCreateCampaign_RejectsNegativeMultiplier(t *testing.T) {
	svc := newValidationOnlyService()
	req := baseCampaignReq()
	req.Rules = []RuleInput{
		{RuleType: "wagering", RuleConfig: mustRuleConfig(t, map[string]any{"multiplier": -1})},
	}
	if _, err := svc.CreateCampaign(context.Background(), req); err == nil {
		t.Fatal("expected rejection of negative wagering multiplier")
	}
}

func TestCreateCampaign_RejectsNegativeReward(t *testing.T) {
	svc := newValidationOnlyService()
	req := baseCampaignReq()
	req.Rules = []RuleInput{
		{RuleType: "reward", RuleConfig: mustRuleConfig(t, map[string]any{"fixed_amount_cents": -100})},
	}
	if _, err := svc.CreateCampaign(context.Background(), req); err == nil {
		t.Fatal("expected rejection of negative reward amount")
	}
}

func TestCreateCampaign_RejectsRewardOverCeiling(t *testing.T) {
	svc := newValidationOnlyService()
	req := baseCampaignReq()
	req.Rules = []RuleInput{
		{RuleType: "reward", RuleConfig: mustRuleConfig(t, map[string]any{"fixed_amount_cents": maxBonusAmountCents + 1})},
	}
	if _, err := svc.CreateCampaign(context.Background(), req); err == nil {
		t.Fatal("expected rejection of reward above absolute ceiling")
	}
}

func TestCreateCampaign_RejectsNegativeBudget(t *testing.T) {
	svc := newValidationOnlyService()
	req := baseCampaignReq()
	neg := int64(-1)
	req.BudgetCents = &neg
	if _, err := svc.CreateCampaign(context.Background(), req); err == nil {
		t.Fatal("expected rejection of negative budget")
	}
}

func TestWithinWindow(t *testing.T) {
	now := time.Now().UTC()
	c := Campaign{StartAt: now.Add(-time.Hour), EndAt: now.Add(time.Hour)}
	if !withinWindow(c, now) {
		t.Fatal("expected now to be within window")
	}
	if withinWindow(c, now.Add(2*time.Hour)) {
		t.Fatal("expected after-end to be outside window")
	}
	if withinWindow(c, now.Add(-2*time.Hour)) {
		t.Fatal("expected before-start to be outside window")
	}
}
