package bonus

import (
	"encoding/json"
	"testing"
)

func TestCreateCampaignRequestNormalizePointAliases(t *testing.T) {
	var req CreateCampaignRequest
	body := []byte(`{
		"name": "Launch Points",
		"campaign_type": "custom",
		"budget_points_cents": 7500,
		"rules": [
			{
				"rule_type": "reward",
				"point_rule_config": {
					"fixed_amount_points_cents": 500,
					"max_bonus_points_cents": 2500,
					"min_points_cents": 100,
					"type": "freebet"
				}
			},
			{
				"rule_type": "play",
				"point_rule_config": {
					"multiplier": 3,
					"max_play_contribution_points_cents": 200,
					"max_stake_contribution_points_cents": 999
				}
			},
			{
				"rule_type": "eligibility",
				"point_rule_config": {
					"min_point_activity_count": 2,
					"rank_min": "gold"
				}
			}
		]
	}`)
	if err := json.Unmarshal(body, &req); err != nil {
		t.Fatalf("unmarshal request: %v", err)
	}

	req.NormalizePointAliases()

	if req.CampaignType != "custom" {
		t.Fatalf("expected campaign type to stay custom, got %q", req.CampaignType)
	}
	if req.BudgetCents == nil || *req.BudgetCents != 7500 {
		t.Fatalf("expected budget alias to normalize, got %+v", req.BudgetCents)
	}
	var reward map[string]any
	if err := json.Unmarshal(req.Rules[0].RuleConfig, &reward); err != nil {
		t.Fatalf("unmarshal normalized reward config: %v", err)
	}
	if reward["fixed_amount_cents"] != float64(500) {
		t.Fatalf("expected fixed amount alias, got %+v", reward)
	}
	if reward["max_bonus_cents"] != float64(2500) {
		t.Fatalf("expected max bonus alias, got %+v", reward)
	}
	if reward["min_amount_cents"] != float64(100) {
		t.Fatalf("expected minimum point alias, got %+v", reward)
	}
	if reward["type"] != "point_grant" {
		t.Fatalf("expected retired reward type to normalize, got %+v", reward)
	}
	for _, retiredInput := range []string{"fixed_amount_points_cents", "max_bonus_points_cents", "min_points_cents"} {
		if _, ok := reward[retiredInput]; ok {
			t.Fatalf("point request alias %q should be normalized before persistence: %+v", retiredInput, reward)
		}
	}

	var play map[string]any
	if err := json.Unmarshal(req.Rules[1].RuleConfig, &play); err != nil {
		t.Fatalf("unmarshal normalized play config: %v", err)
	}
	if play["max_stake_contribution_cents"] != float64(200) {
		t.Fatalf("expected max contribution alias, got %+v", play)
	}
	if _, ok := play["max_play_contribution_points_cents"]; ok {
		t.Fatalf("point-play request alias should be normalized before persistence: %+v", play)
	}
	if _, ok := play["max_stake_contribution_points_cents"]; ok {
		t.Fatalf("legacy stake request alias should be normalized before persistence: %+v", play)
	}
	if req.Rules[1].RuleType != "wagering" {
		t.Fatalf("expected public play rule type to normalize to internal wagering rule, got %q", req.Rules[1].RuleType)
	}

	var eligibility map[string]any
	if err := json.Unmarshal(req.Rules[2].RuleConfig, &eligibility); err != nil {
		t.Fatalf("unmarshal normalized eligibility config: %v", err)
	}
	if eligibility["min_deposits"] != float64(2) {
		t.Fatalf("expected point activity alias to normalize, got %+v", eligibility)
	}
	if eligibility["tier_min"] != "gold" {
		t.Fatalf("expected rank alias to normalize, got %+v", eligibility)
	}
	if _, ok := eligibility["min_point_activity_count"]; ok {
		t.Fatalf("point activity request alias should be normalized before persistence: %+v", eligibility)
	}
	if _, ok := eligibility["rank_min"]; ok {
		t.Fatalf("rank request alias should be normalized before persistence: %+v", eligibility)
	}
}

func TestCreateCampaignRequestNormalizeRetiredPromoCampaignTypes(t *testing.T) {
	for _, tc := range []struct {
		input string
		want  string
	}{
		{input: "freebet_grant", want: "point_grant"},
		{input: "freebet", want: "point_grant"},
		{input: "cash", want: "point_grant"},
		{input: "odds_boost", want: "point_grant"},
		{input: "deposit_match", want: "point_match"},
		{input: "point_grant", want: "point_grant"},
		{input: "point_match", want: "point_match"},
	} {
		t.Run(tc.input, func(t *testing.T) {
			req := CreateCampaignRequest{CampaignType: tc.input}
			req.NormalizePointAliases()
			if req.CampaignType != tc.want {
				t.Fatalf("expected campaign type %q to normalize to %q, got %q", tc.input, tc.want, req.CampaignType)
			}
		})
	}
}

func TestRuleInputNormalizeRetiredRewardConfigTypes(t *testing.T) {
	for _, tc := range []struct {
		input string
		want  string
	}{
		{input: "freebet_grant", want: "point_grant"},
		{input: "freebet", want: "point_grant"},
		{input: "cash", want: "point_grant"},
		{input: "odds_boost", want: "point_grant"},
		{input: "deposit_match", want: "point_match"},
		{input: "point_grant", want: "point_grant"},
		{input: "point_match", want: "point_match"},
	} {
		t.Run(tc.input, func(t *testing.T) {
			rule := RuleInput{
				RuleType: "reward",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"type": tc.input,
				}),
			}

			rule.NormalizePointAliases()

			var cfg map[string]any
			if err := json.Unmarshal(rule.RuleConfig, &cfg); err != nil {
				t.Fatalf("unmarshal normalized config: %v", err)
			}
			if cfg["type"] != tc.want {
				t.Fatalf("expected reward type %q to normalize to %q, got %+v", tc.input, tc.want, cfg)
			}
		})
	}
}

func TestRuleInputPrefersPointRuleConfigOverLegacyRuleConfig(t *testing.T) {
	rule := RuleInput{
		RuleType: "reward",
		RuleConfig: mustRuleConfigForModels(t, map[string]any{
			"fixed_amount_cents": 999,
			"type":               "cash",
		}),
		PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
			"fixed_amount_points_cents": 500,
			"type":                      "point_grant",
		}),
	}

	rule.NormalizePointAliases()

	var cfg map[string]any
	if err := json.Unmarshal(rule.RuleConfig, &cfg); err != nil {
		t.Fatalf("unmarshal normalized config: %v", err)
	}
	if cfg["fixed_amount_cents"] != float64(500) {
		t.Fatalf("expected point_rule_config amount to win, got %+v", cfg)
	}
	if cfg["type"] != "point_grant" {
		t.Fatalf("expected point_rule_config type to win, got %+v", cfg)
	}
}

func TestRuleInputLaunchValidationPrefersPointRuleConfigOverLegacyRuleConfig(t *testing.T) {
	rule := RuleInput{
		RuleType: "play",
		RuleConfig: mustRuleConfigForModels(t, map[string]any{
			"min_odds_decimal": 1.5,
		}),
		PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
			"multiplier": 3,
		}),
	}

	if err := rule.ValidateLaunchCopy(0); err != nil {
		t.Fatalf("expected preferred point_rule_config to control validation, got %v", err)
	}
}

func TestCreateCampaignRequestDetectsConflictingBudgetAliases(t *testing.T) {
	legacy := int64(1000)
	points := int64(2000)
	req := CreateCampaignRequest{BudgetCents: &legacy, BudgetPointsCents: &points}
	if !req.HasConflictingBudgetAliases() {
		t.Fatal("expected mismatched budget aliases to conflict")
	}

	points = legacy
	if req.HasConflictingBudgetAliases() {
		t.Fatal("expected matching budget aliases to be accepted")
	}
}

func TestCreateCampaignRequestDetectsConflictingRuleAmountAliases(t *testing.T) {
	req := CreateCampaignRequest{
		Rules: []RuleInput{
			{
				RuleType: "reward",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"fixed_amount_points_cents": 500,
					"fixed_amount_cents":        700,
				}),
			},
		},
	}

	err := req.ValidatePointAliasConflicts()
	if err == nil {
		t.Fatal("expected conflicting reward amount aliases")
	}
	if got := err.Error(); got != "rules[0]: fixed_amount_points_cents conflicts with fixed_amount_cents" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCreateCampaignRequestDetectsConflictingRuleContributionAliases(t *testing.T) {
	req := CreateCampaignRequest{
		Rules: []RuleInput{
			{
				RuleType: "play",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"max_play_contribution_points_cents": 200,
					"max_stake_contribution_cents":       300,
				}),
			},
		},
	}

	err := req.ValidatePointAliasConflicts()
	if err == nil {
		t.Fatal("expected conflicting play contribution aliases")
	}
	if got := err.Error(); got != "rules[0]: max_play_contribution_points_cents conflicts with max_stake_contribution_cents" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCreateCampaignRequestAllowsMatchingRuleAliases(t *testing.T) {
	req := CreateCampaignRequest{
		BudgetCents:       int64PtrForModels(7500),
		BudgetPointsCents: int64PtrForModels(7500),
		Rules: []RuleInput{
			{
				RuleType: "reward",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"fixed_amount_points_cents": 500,
					"fixed_amount_cents":        500,
					"max_bonus_points_cents":    2500,
					"max_bonus_cents":           2500,
					"min_points_cents":          100,
					"min_amount_cents":          100,
				}),
			},
			{
				RuleType: "play",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"max_play_contribution_points_cents":  200,
					"max_stake_contribution_points_cents": 200,
					"max_stake_contribution_cents":        200,
				}),
			},
		},
	}

	if err := req.ValidatePointAliasConflicts(); err != nil {
		t.Fatalf("expected matching aliases to be accepted, got %v", err)
	}
}

func TestCreateCampaignRequestRejectsProhibitedLaunchCopy(t *testing.T) {
	for _, tc := range []struct {
		name      string
		request   CreateCampaignRequest
		wantField string
	}{
		{
			name:      "name",
			request:   CreateCampaignRequest{Name: "Cash Bonus", Description: "Point-play status only."},
			wantField: "name",
		},
		{
			name:      "description",
			request:   CreateCampaignRequest{Name: "Status Boost", Description: "Redeemable rank rewards for top players."},
			wantField: "description",
		},
		{
			name:      "wagering copy",
			request:   CreateCampaignRequest{Name: "Status Boost", Description: "Complete wagering to earn a freebet."},
			wantField: "description",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.request.ValidateLaunchCopy()
			if err == nil {
				t.Fatal("expected launch-copy error")
			}
			fieldErr, ok := err.(interface{ FieldName() string })
			if !ok {
				t.Fatalf("expected field error, got %T", err)
			}
			if fieldErr.FieldName() != tc.wantField {
				t.Fatalf("expected field %q, got %q", tc.wantField, fieldErr.FieldName())
			}
		})
	}
}

func TestCreateCampaignRequestRejectsProhibitedTriggerEventCopy(t *testing.T) {
	req := CreateCampaignRequest{
		Name:        "Status Boost",
		Description: "Non-redeemable point-play status only.",
		Rules: []RuleInput{
			{
				RuleType: "trigger",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"event": "deposit",
				}),
			},
		},
	}

	err := req.ValidateLaunchCopy()
	if err == nil {
		t.Fatal("expected unsafe trigger event to be rejected")
	}
	fieldErr, ok := err.(interface{ FieldName() string })
	if !ok {
		t.Fatalf("expected field error, got %T", err)
	}
	if fieldErr.FieldName() != "rules[0].point_rule_config.event" {
		t.Fatalf("expected trigger event field, got %q", fieldErr.FieldName())
	}
}

func TestCreateCampaignRequestRejectsRetiredEligibilityDepositKey(t *testing.T) {
	req := CreateCampaignRequest{
		Name:        "Status Boost",
		Description: "Non-redeemable point-play status only.",
		Rules: []RuleInput{
			{
				RuleType: "eligibility",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"min_deposits": 1,
				}),
			},
		},
	}

	err := req.ValidateLaunchCopy()
	if err == nil {
		t.Fatal("expected retired eligibility key to be rejected")
	}
	fieldErr, ok := err.(interface{ FieldName() string })
	if !ok {
		t.Fatalf("expected field error, got %T", err)
	}
	if fieldErr.FieldName() != "rules[0].point_rule_config.min_point_activity_count" {
		t.Fatalf("expected point activity field, got %q", fieldErr.FieldName())
	}
}

func TestCreateCampaignRequestRejectsRetiredEligibilityRankKey(t *testing.T) {
	req := CreateCampaignRequest{
		Name:        "Status Boost",
		Description: "Non-redeemable point-play status only.",
		Rules: []RuleInput{
			{
				RuleType: "eligibility",
				PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
					"tier_min": "gold",
				}),
			},
		},
	}

	err := req.ValidateLaunchCopy()
	if err == nil {
		t.Fatal("expected retired rank key to be rejected")
	}
	fieldErr, ok := err.(interface{ FieldName() string })
	if !ok {
		t.Fatalf("expected field error, got %T", err)
	}
	if fieldErr.FieldName() != "rules[0].point_rule_config.rank_min" {
		t.Fatalf("expected rank field, got %q", fieldErr.FieldName())
	}
}

func TestCreateCampaignRequestRejectsRetiredPointPlayMechanics(t *testing.T) {
	for _, key := range []string{"min_odds_decimal", "parlay_multiplier", "excluded_sports"} {
		t.Run(key, func(t *testing.T) {
			req := CreateCampaignRequest{
				Name:        "Status Boost",
				Description: "Non-redeemable point-play status only.",
				Rules: []RuleInput{
					{
						RuleType: "play",
						PointRuleConfig: mustRuleConfigForModels(t, map[string]any{
							key: 1,
						}),
					},
				},
			}

			err := req.ValidateLaunchCopy()
			if err == nil {
				t.Fatal("expected retired point-play mechanic to be rejected")
			}
			fieldErr, ok := err.(interface{ FieldName() string })
			if !ok {
				t.Fatalf("expected field error, got %T", err)
			}
			wantField := "rules[0].point_rule_config." + key
			if fieldErr.FieldName() != wantField {
				t.Fatalf("expected field %q, got %q", wantField, fieldErr.FieldName())
			}
		})
	}
}

func TestCreateCampaignRequestAllowsNonRedeemableDisclosureCopy(t *testing.T) {
	req := CreateCampaignRequest{
		Name:        "Status Boost",
		Description: "Non-redeemable point-play status only.",
	}

	if err := req.ValidateLaunchCopy(); err != nil {
		t.Fatalf("expected safe non-redeemable disclosure copy, got %v", err)
	}
}

func TestGrantBonusRequestNormalizePointAliases(t *testing.T) {
	var req GrantBonusRequest
	if err := json.Unmarshal([]byte(`{"user_id":"u-1","campaign_id":7,"override_points_cents":1234,"reason":"support adjustment"}`), &req); err != nil {
		t.Fatalf("unmarshal request: %v", err)
	}

	req.NormalizePointAliases()

	if req.OverrideAmountCents == nil || *req.OverrideAmountCents != 1234 {
		t.Fatalf("expected override point alias to normalize, got %+v", req.OverrideAmountCents)
	}
}

func TestGrantBonusRequestDetectsConflictingOverrideAliases(t *testing.T) {
	legacy := int64(1000)
	points := int64(2000)
	req := GrantBonusRequest{OverrideAmountCents: &legacy, OverridePointsCents: &points}
	if !req.HasConflictingOverrideAliases() {
		t.Fatal("expected mismatched override aliases to conflict")
	}

	points = legacy
	if req.HasConflictingOverrideAliases() {
		t.Fatal("expected matching override aliases to be accepted")
	}
}

func mustRuleConfigForModels(t *testing.T, v any) json.RawMessage {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal rule config: %v", err)
	}
	return b
}

func int64PtrForModels(v int64) *int64 {
	return &v
}
