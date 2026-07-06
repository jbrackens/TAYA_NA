package loyalty

import (
	"context"
	"encoding/json"
	"strings"
)

// Admin-facing tier-config service. Reads/writes the DB-backed config table
// (predict_tier_config_repo.go) and maps it to the office /loyalty/settings
// LoyaltyTier shape. Falls back to the tiers.go constants when the table is
// empty (fresh DB before migration 021 seed, or a fake repo).
//
// SCOPE: tier config only — leaderboard config is out of scope (computed boards
// are a separate design question).

// tierConfigStore is the slice of *PredictSQLRepo the config methods need.
// Reached via capability assertion so PredictRepo + its test fakes stay
// unchanged (same trick AdminTiers/ListAdminAccounts already use).
type tierConfigStore interface {
	GetLoyaltyTierConfig(ctx context.Context) ([]PredictTierConfigRow, error)
	UpdateLoyaltyTierConfig(ctx context.Context, in PredictTierConfigRow) (*PredictTierConfigRow, error)
}

// EditableTier is the office's LoyaltyTier shape (app/(dashboard)/loyalty/
// settings/page.tsx). JSON tags match the page's interface exactly:
//
//	{ tierCode, displayName, rank, minLifetimePoints,
//	  minRolling30dPoints?, benefits?: Record<string,string>, active }
type EditableTier struct {
	TierCode            string            `json:"tierCode"`
	DisplayName         string            `json:"displayName"`
	Rank                int               `json:"rank"`
	MinLifetimePoints   int64             `json:"minLifetimePoints"`
	MinRolling30dPoints int64             `json:"minRolling30dPoints"`
	Benefits            map[string]string `json:"benefits,omitempty"`
	Active              bool              `json:"active"`
}

// tierCodeToRank maps a tier_code (the stable machine code) to its numeric rank.
// Mirrors the constant ordering in tiers.go. Used to derive the PRIMARY KEY when
// the office addresses a tier by code.
var tierCodeToRank = map[string]PredictTier{
	"hidden":   PredictTierHidden,
	"newcomer": PredictTierNewcomer,
	"trader":   PredictTierTrader,
	"sharp":    PredictTierSharp,
	"whale":    PredictTierWhale,
	"legend":   PredictTierLegend,
}

// editableTierFromRow maps a stored config row to the office shape. Benefits is
// normalized to a {key:value} object regardless of whether it was stored as a
// JSON object (office editor) or a JSON array (the seeded constant copy — keyed
// "benefit_1", "benefit_2", ...).
func editableTierFromRow(row PredictTierConfigRow) EditableTier {
	return EditableTier{
		TierCode:            row.TierCode,
		DisplayName:         row.DisplayName,
		Rank:                int(row.Tier),
		MinLifetimePoints:   row.PointsThreshold,
		MinRolling30dPoints: row.MinRolling30dPoints,
		Benefits:            normalizeBenefits(row.Benefits),
		Active:              row.Active,
	}
}

// normalizeBenefits accepts either the office object shape {"k":"v"} or the
// seeded array shape ["a","b"] and always returns a {key:value} map. Returns
// nil for empty/absent benefits so the JSON omitempty drops the field.
func normalizeBenefits(raw json.RawMessage) map[string]string {
	if len(raw) == 0 {
		return nil
	}
	// Try object first (the office editor's shape).
	obj := map[string]string{}
	if err := json.Unmarshal(raw, &obj); err == nil {
		if len(obj) == 0 {
			return nil
		}
		return obj
	}
	// Fall back to array (the seeded constant shape): key by 1-based index.
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil {
		if len(arr) == 0 {
			return nil
		}
		out := make(map[string]string, len(arr))
		for i, b := range arr {
			out["benefit_"+itoa(i+1)] = b
		}
		return out
	}
	return nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

// constantTierConfig is the fallback used when the DB table is empty or the repo
// doesn't support config (a fake). Built from the tiers.go constants so the
// office still renders the real tier ladder. Skips Hidden (no display name).
func constantTierConfig() []EditableTier {
	out := []EditableTier{}
	for _, def := range PredictTiers() {
		if def.Name == "" {
			continue // Hidden tier — not editable.
		}
		benefits := map[string]string{}
		for i, b := range def.Benefits {
			benefits["benefit_"+itoa(i+1)] = b
		}
		if len(benefits) == 0 {
			benefits = nil
		}
		out = append(out, EditableTier{
			TierCode:          strings.ToLower(def.Name),
			DisplayName:       def.Name,
			Rank:              int(def.Tier),
			MinLifetimePoints: def.PointsThreshold,
			Benefits:          benefits,
			Active:            true,
		})
	}
	return out
}

// EditableTiers returns the editable tier list for the office settings page.
// Reads the DB-backed config; falls back to the tiers.go constants when the
// table is empty or the repo doesn't support config. The Hidden (tier 0) row is
// filtered out (no display name to edit). Ordered by rank.
func (s *PredictService) EditableTiers(ctx context.Context) ([]EditableTier, error) {
	store, ok := s.repo.(tierConfigStore)
	if !ok {
		return constantTierConfig(), nil
	}
	rows, err := store.GetLoyaltyTierConfig(ctx)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return constantTierConfig(), nil
	}
	out := []EditableTier{}
	for _, row := range rows {
		if row.Tier == PredictTierHidden {
			continue // Hidden — not surfaced for editing.
		}
		out = append(out, editableTierFromRow(row))
	}
	if len(out) == 0 {
		return constantTierConfig(), nil
	}
	return out, nil
}

// UpdateTier persists one tier (addressed by tierCode) and returns the full
// updated editable list (the office's saveTier reads `data.tiers` from the
// response). Returns ErrTierConfigUnsupported if the repo can't persist, and
// ErrTierNotFound if tierCode isn't a known tier.
func (s *PredictService) UpdateTier(ctx context.Context, tierCode string, in EditableTier) ([]EditableTier, error) {
	store, ok := s.repo.(tierConfigStore)
	if !ok {
		return nil, ErrTierConfigUnsupported
	}
	code := strings.ToLower(strings.TrimSpace(tierCode))
	rank, known := tierCodeToRank[code]
	if !known {
		return nil, ErrTierConfigNotFound
	}

	// Benefits → JSONB object. Empty map serializes as {} (not null) so the
	// column's NOT NULL DEFAULT is respected.
	benefits := in.Benefits
	if benefits == nil {
		benefits = map[string]string{}
	}
	benefitsJSON, err := json.Marshal(benefits)
	if err != nil {
		return nil, err
	}

	multiplier := 1.0 // runtime formula isn't tier-aware yet; persist the default.
	row := PredictTierConfigRow{
		Tier:                rank,
		TierCode:            code,
		DisplayName:         in.DisplayName,
		PointsThreshold:     in.MinLifetimePoints,
		MinRolling30dPoints: in.MinRolling30dPoints,
		PointsMultiplier:    multiplier,
		Benefits:            json.RawMessage(benefitsJSON),
		Active:              in.Active,
	}
	if _, err := store.UpdateLoyaltyTierConfig(ctx, row); err != nil {
		return nil, err
	}
	return s.EditableTiers(ctx)
}
