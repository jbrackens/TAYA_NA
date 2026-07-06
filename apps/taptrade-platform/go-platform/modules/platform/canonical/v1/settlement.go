package v1

import "errors"

// SettlementResolver defines the interface for resolving market settlements.
type SettlementResolver interface {
	// Resolve takes market data and returns the settlement outcome.
	Resolve(marketData *MarketSettlementData) (*SettlementResolution, error)

	// ValidateResultData ensures result data is in expected format.
	ValidateResultData(resultData map[string]interface{}) error
}

// MarketSettlementData contains data needed to settle a market.
type MarketSettlementData struct {
	MarketType    MarketType
	Selections    []SettlementSelection
	ResultData    map[string]interface{}
	IsVoid        bool
	VoidReason    string
}

// SettlementSelection represents a selection in a settlement context.
type SettlementSelection struct {
	ID       string
	Name     string
	OddsDec  float64
	IsResult bool // Whether this selection is the result
}

// SettlementResolution represents the outcome of settlement.
type SettlementResolution struct {
	Outcome            SettlementOutcome
	WinningSelections  []string // IDs of winning selections
	DeadHeatFactor     *float64 // For dead heat markets
	Reason             string
	VoidReason         string
}

// SettlementResolverFactory creates appropriate resolver for market type.
type SettlementResolverFactory struct{}

// GetResolver returns the appropriate settlement resolver for a market type.
func (f *SettlementResolverFactory) GetResolver(marketType MarketType) (SettlementResolver, error) {
	switch {
	case marketType.IsFootballMarket():
		return newFootballSettlementResolver(marketType), nil
	case marketType.IsNFLMarket():
		return newNFLSettlementResolver(marketType), nil
	case marketType.IsNBAMarket():
		return newNBASettlementResolver(marketType), nil
	case marketType.IsMLBMarket():
		return newMLBSettlementResolver(marketType), nil
	case marketType.IsNHLMarket():
		return newNHLSettlementResolver(marketType), nil
	case marketType.IsTennisMarket():
		return newTennisSettlementResolver(marketType), nil
	case marketType.IsCombatMarket():
		return newCombatSettlementResolver(marketType), nil
	case marketType.IsEsportsMarket():
		return newEsportsSettlementResolver(marketType), nil
	case marketType.IsCrossMarket():
		return newCrossSettlementResolver(marketType), nil
	default:
		return nil, errors.New("unknown market type: " + string(marketType))
	}
}

// Football Settlement Resolver
type footballResolver struct {
	marketType MarketType
}

func newFootballSettlementResolver(mt MarketType) SettlementResolver {
	return &footballResolver{marketType: mt}
}

func (r *footballResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	switch r.marketType {
	case MarketType1X2:
		return r.resolve1X2(data)
	case MarketTypeBTTS:
		return r.resolveBTTS(data)
	case MarketTypeAsianHandicap:
		return r.resolveAsianHandicap(data)
	case MarketTypeOverUnder:
		return r.resolveOverUnder(data)
	case MarketTypeCorrectScore:
		return r.resolveCorrectScore(data)
	case MarketTypeHalftimeResult:
		return r.resolveHalftimeResult(data)
	default:
		return r.resolveGeneric(data)
	}
}

func (r *footballResolver) resolve1X2(data *MarketSettlementData) (*SettlementResolution, error) {
	homeGoals, err := getIntValue(data.ResultData, "homeGoals")
	if err != nil {
		return nil, err
	}
	awayGoals, err := getIntValue(data.ResultData, "awayGoals")
	if err != nil {
		return nil, err
	}

	var winnerName string
	if homeGoals > awayGoals {
		winnerName = "1"
	} else if awayGoals > homeGoals {
		winnerName = "2"
	} else {
		winnerName = "X"
	}

	winningSelection := findSelectionByName(data.Selections, winnerName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine 1X2 winner",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "1X2 settlement based on final score",
	}, nil
}

func (r *footballResolver) resolveBTTS(data *MarketSettlementData) (*SettlementResolution, error) {
	homeGoals, err := getIntValue(data.ResultData, "homeGoals")
	if err != nil {
		return nil, err
	}
	awayGoals, err := getIntValue(data.ResultData, "awayGoals")
	if err != nil {
		return nil, err
	}

	bttsResult := homeGoals > 0 && awayGoals > 0
	resultName := "Yes"
	if !bttsResult {
		resultName = "No"
	}

	winningSelection := findSelectionByName(data.Selections, resultName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine BTTS result",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "BTTS settlement: " + resultName,
	}, nil
}

func (r *footballResolver) resolveAsianHandicap(data *MarketSettlementData) (*SettlementResolution, error) {
	homeGoals, err := getIntValue(data.ResultData, "homeGoals")
	if err != nil {
		return nil, err
	}
	awayGoals, err := getIntValue(data.ResultData, "awayGoals")
	if err != nil {
		return nil, err
	}

	handicap, err := getFloatValue(data.ResultData, "handicap")
	if err != nil {
		return nil, err
	}

	homeAdjusted := float64(homeGoals) + handicap
	var winningID string

	if homeAdjusted > float64(awayGoals) {
		if sel := findSelectionByName(data.Selections, "Home"); sel != nil {
			winningID = sel.ID
		}
	} else if homeAdjusted < float64(awayGoals) {
		if sel := findSelectionByName(data.Selections, "Away"); sel != nil {
			winningID = sel.ID
		}
	} else {
		return &SettlementResolution{
			Outcome: SettlementOutcomePush,
			Reason:  "Asian handicap push",
		}, nil
	}

	if winningID == "" {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine Asian handicap winner",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningID},
		Reason:            "Asian handicap settlement",
	}, nil
}

func (r *footballResolver) resolveCorrectScore(data *MarketSettlementData) (*SettlementResolution, error) {
	homeGoals, err := getIntValue(data.ResultData, "homeGoals")
	if err != nil {
		return nil, err
	}
	awayGoals, err := getIntValue(data.ResultData, "awayGoals")
	if err != nil {
		return nil, err
	}

	scoreName := formatScore(homeGoals, awayGoals)
	winningSelection := findSelectionByName(data.Selections, scoreName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "No selection matched correct score",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "Correct score settlement: " + scoreName,
	}, nil
}

func (r *footballResolver) resolveHalftimeResult(data *MarketSettlementData) (*SettlementResolution, error) {
	homeHT, err := getIntValue(data.ResultData, "homeHalftime")
	if err != nil {
		return nil, err
	}
	awayHT, err := getIntValue(data.ResultData, "awayHalftime")
	if err != nil {
		return nil, err
	}

	var winnerName string
	if homeHT > awayHT {
		winnerName = "1"
	} else if awayHT > homeHT {
		winnerName = "2"
	} else {
		winnerName = "X"
	}

	winningSelection := findSelectionByName(data.Selections, winnerName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine halftime result",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "Halftime result settlement",
	}, nil
}

func (r *footballResolver) resolveOverUnder(data *MarketSettlementData) (*SettlementResolution, error) {
	homeGoals, err := getIntValue(data.ResultData, "homeGoals")
	if err != nil {
		return nil, err
	}
	awayGoals, err := getIntValue(data.ResultData, "awayGoals")
	if err != nil {
		return nil, err
	}
	threshold, err := getFloatValue(data.ResultData, "threshold")
	if err != nil {
		return nil, err
	}

	totalGoals := float64(homeGoals + awayGoals)
	var resultName string
	if totalGoals > threshold {
		resultName = "Over"
	} else if totalGoals < threshold {
		resultName = "Under"
	} else {
		return &SettlementResolution{
			Outcome: SettlementOutcomePush,
			Reason:  "Over/Under push at threshold",
		}, nil
	}

	winningSelection := findSelectionByName(data.Selections, resultName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine over/under result",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "Over/Under settlement: " + resultName,
	}, nil
}

func (r *footballResolver) resolveGeneric(data *MarketSettlementData) (*SettlementResolution, error) {
	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "Generic settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *footballResolver) ValidateResultData(data map[string]interface{}) error {
	switch r.marketType {
	case MarketType1X2, MarketTypeHalftimeResult:
		if _, err := getIntValue(data, "homeGoals"); err != nil {
			return err
		}
		if _, err := getIntValue(data, "awayGoals"); err != nil {
			return err
		}
	case MarketTypeOverUnder:
		if _, err := getIntValue(data, "homeGoals"); err != nil {
			return err
		}
		if _, err := getIntValue(data, "awayGoals"); err != nil {
			return err
		}
		if _, err := getFloatValue(data, "threshold"); err != nil {
			return err
		}
	case MarketTypeAsianHandicap:
		if _, err := getIntValue(data, "homeGoals"); err != nil {
			return err
		}
		if _, err := getIntValue(data, "awayGoals"); err != nil {
			return err
		}
		if _, err := getFloatValue(data, "handicap"); err != nil {
			return err
		}
	}
	return nil
}

// NFL Settlement Resolver
type nflResolver struct {
	marketType MarketType
}

func newNFLSettlementResolver(mt MarketType) SettlementResolver {
	return &nflResolver{marketType: mt}
}

func (r *nflResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	switch r.marketType {
	case MarketTypeSpread:
		return r.resolveSpread(data)
	case MarketTypeTotal:
		return r.resolveTotal(data)
	case MarketTypeMoneyline:
		return r.resolveMoneyline(data)
	default:
		return r.resolveGeneric(data)
	}
}

func (r *nflResolver) resolveSpread(data *MarketSettlementData) (*SettlementResolution, error) {
	homeScore, err := getIntValue(data.ResultData, "homeScore")
	if err != nil {
		return nil, err
	}
	awayScore, err := getIntValue(data.ResultData, "awayScore")
	if err != nil {
		return nil, err
	}
	spread, err := getFloatValue(data.ResultData, "spread")
	if err != nil {
		return nil, err
	}

	homeAdjusted := float64(homeScore) + spread
	var resultName string
	if homeAdjusted > float64(awayScore) {
		resultName = "Home"
	} else if homeAdjusted < float64(awayScore) {
		resultName = "Away"
	} else {
		return &SettlementResolution{
			Outcome: SettlementOutcomePush,
			Reason:  "Spread push",
		}, nil
	}

	winningSelection := findSelectionByName(data.Selections, resultName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine spread winner",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "NFL spread settlement",
	}, nil
}

func (r *nflResolver) resolveTotal(data *MarketSettlementData) (*SettlementResolution, error) {
	homeScore, err := getIntValue(data.ResultData, "homeScore")
	if err != nil {
		return nil, err
	}
	awayScore, err := getIntValue(data.ResultData, "awayScore")
	if err != nil {
		return nil, err
	}
	threshold, err := getFloatValue(data.ResultData, "threshold")
	if err != nil {
		return nil, err
	}

	totalScore := float64(homeScore + awayScore)
	var resultName string
	if totalScore > threshold {
		resultName = "Over"
	} else if totalScore < threshold {
		resultName = "Under"
	} else {
		return &SettlementResolution{
			Outcome: SettlementOutcomePush,
			Reason:  "Total push",
		}, nil
	}

	winningSelection := findSelectionByName(data.Selections, resultName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine total result",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "NFL total settlement",
	}, nil
}

func (r *nflResolver) resolveMoneyline(data *MarketSettlementData) (*SettlementResolution, error) {
	homeScore, err := getIntValue(data.ResultData, "homeScore")
	if err != nil {
		return nil, err
	}
	awayScore, err := getIntValue(data.ResultData, "awayScore")
	if err != nil {
		return nil, err
	}

	var resultName string
	if homeScore > awayScore {
		resultName = "Home"
	} else {
		resultName = "Away"
	}

	winningSelection := findSelectionByName(data.Selections, resultName)
	if winningSelection == nil {
		return &SettlementResolution{
			Outcome: SettlementOutcomeVoid,
			Reason:  "Could not determine moneyline winner",
		}, nil
	}

	return &SettlementResolution{
		Outcome:           SettlementOutcomeWin,
		WinningSelections: []string{winningSelection.ID},
		Reason:            "NFL moneyline settlement",
	}, nil
}

func (r *nflResolver) resolveGeneric(data *MarketSettlementData) (*SettlementResolution, error) {
	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "Generic NFL settlement",
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *nflResolver) ValidateResultData(data map[string]interface{}) error {
	return nil // NFL validation varies by market type
}

// NBA Settlement Resolver
type nbaResolver struct {
	marketType MarketType
}

func newNBASettlementResolver(mt MarketType) SettlementResolver {
	return &nbaResolver{marketType: mt}
}

func (r *nbaResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "NBA settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *nbaResolver) ValidateResultData(data map[string]interface{}) error {
	return nil
}

// MLB Settlement Resolver
type mlbResolver struct {
	marketType MarketType
}

func newMLBSettlementResolver(mt MarketType) SettlementResolver {
	return &mlbResolver{marketType: mt}
}

func (r *mlbResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "MLB settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *mlbResolver) ValidateResultData(data map[string]interface{}) error {
	return nil
}

// NHL Settlement Resolver
type nhlResolver struct {
	marketType MarketType
}

func newNHLSettlementResolver(mt MarketType) SettlementResolver {
	return &nhlResolver{marketType: mt}
}

func (r *nhlResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "NHL settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *nhlResolver) ValidateResultData(data map[string]interface{}) error {
	return nil
}

// Tennis Settlement Resolver
type tennisResolver struct {
	marketType MarketType
}

func newTennisSettlementResolver(mt MarketType) SettlementResolver {
	return &tennisResolver{marketType: mt}
}

func (r *tennisResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "Tennis settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *tennisResolver) ValidateResultData(data map[string]interface{}) error {
	return nil
}

// Combat Settlement Resolver
type combatResolver struct {
	marketType MarketType
}

func newCombatSettlementResolver(mt MarketType) SettlementResolver {
	return &combatResolver{marketType: mt}
}

func (r *combatResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "Combat settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *combatResolver) ValidateResultData(data map[string]interface{}) error {
	return nil
}

// Esports Settlement Resolver
type esportsResolver struct {
	marketType MarketType
}

func newEsportsSettlementResolver(mt MarketType) SettlementResolver {
	return &esportsResolver{marketType: mt}
}

func (r *esportsResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "Esports settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *esportsResolver) ValidateResultData(data map[string]interface{}) error {
	return nil
}

// Cross-Sport Settlement Resolver
type crossResolver struct {
	marketType MarketType
}

func newCrossSettlementResolver(mt MarketType) SettlementResolver {
	return &crossResolver{marketType: mt}
}

func (r *crossResolver) Resolve(data *MarketSettlementData) (*SettlementResolution, error) {
	if data.IsVoid {
		return &SettlementResolution{
			Outcome:    SettlementOutcomeVoid,
			VoidReason: data.VoidReason,
		}, nil
	}

	for _, sel := range data.Selections {
		if sel.IsResult {
			return &SettlementResolution{
				Outcome:           SettlementOutcomeWin,
				WinningSelections: []string{sel.ID},
				Reason:            "Cross-sport settlement: " + r.marketType.Variant(),
			}, nil
		}
	}
	return &SettlementResolution{
		Outcome: SettlementOutcomeVoid,
		Reason:  "No winning selection marked",
	}, nil
}

func (r *crossResolver) ValidateResultData(data map[string]interface{}) error {
	return nil
}

// Helper functions
func getIntValue(data map[string]interface{}, key string) (int, error) {
	val, ok := data[key]
	if !ok {
		return 0, errors.New("missing key: " + key)
	}

	switch v := val.(type) {
	case int:
		return v, nil
	case float64:
		return int(v), nil
	default:
		return 0, errors.New("invalid type for key: " + key)
	}
}

func getFloatValue(data map[string]interface{}, key string) (float64, error) {
	val, ok := data[key]
	if !ok {
		return 0, errors.New("missing key: " + key)
	}

	switch v := val.(type) {
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	default:
		return 0, errors.New("invalid type for key: " + key)
	}
}

func findSelectionByName(selections []SettlementSelection, name string) *SettlementSelection {
	for i := range selections {
		if selections[i].Name == name {
			return &selections[i]
		}
	}
	return nil
}

func formatScore(home, away int) string {
	return "" // Placeholder implementation
}
