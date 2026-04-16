package v1

import (
	"errors"
	"fmt"
)

// OddsValidator defines validation rules for odds on different market types.
type OddsValidator interface {
	// ValidateOdds checks if odds are within acceptable range for the market type.
	ValidateOdds(odds float64) error

	// GetMinOdds returns the minimum acceptable odds.
	GetMinOdds() float64

	// GetMaxOdds returns the maximum acceptable odds.
	GetMaxOdds() float64

	// IsPush checks if the odds represent a push/tie condition.
	IsPush(odds float64) bool
}

// OddsValidationFactory creates appropriate validator for market type.
type OddsValidationFactory struct{}

// GetValidator returns the appropriate odds validator for a market type.
func (f *OddsValidationFactory) GetValidator(marketType MarketType) (OddsValidator, error) {
	switch {
	case marketType.IsFootballMarket():
		return newFootballOddsValidator(marketType), nil
	case marketType.IsNFLMarket():
		return newNFLOddsValidator(marketType), nil
	case marketType.IsNBAMarket():
		return newNBAOddsValidator(marketType), nil
	case marketType.IsMLBMarket():
		return newMLBOddsValidator(marketType), nil
	case marketType.IsNHLMarket():
		return newNHLOddsValidator(marketType), nil
	case marketType.IsTennisMarket():
		return newTennisOddsValidator(marketType), nil
	case marketType.IsCombatMarket():
		return newCombatOddsValidator(marketType), nil
	case marketType.IsEsportsMarket():
		return newEsportsOddsValidator(marketType), nil
	case marketType.IsCrossMarket():
		return newCrossOddsValidator(marketType), nil
	default:
		return newDefaultOddsValidator(), nil
	}
}

// DefaultOddsValidator provides baseline validation.
type defaultOddsValidator struct{}

func newDefaultOddsValidator() OddsValidator {
	return &defaultOddsValidator{}
}

func (v *defaultOddsValidator) ValidateOdds(odds float64) error {
	if odds < 1.01 || odds > 1000.0 {
		return fmt.Errorf("odds out of range: %.2f (valid range: 1.01 - 1000.0)", odds)
	}
	return nil
}

func (v *defaultOddsValidator) GetMinOdds() float64 {
	return 1.01
}

func (v *defaultOddsValidator) GetMaxOdds() float64 {
	return 1000.0
}

func (v *defaultOddsValidator) IsPush(odds float64) bool {
	return false
}

// FootballOddsValidator validates football-specific odds ranges.
type footballOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newFootballOddsValidator(mt MarketType) OddsValidator {
	return &footballOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    500.0, // Football markets rarely go higher
	}
}

func (v *footballOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("football odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}

	// Sport-specific validation
	switch v.marketType {
	case MarketType1X2:
		// 1X2 typically has restricted ranges
		if odds > 100.0 {
			return errors.New("unrealistic 1X2 odds")
		}
	case MarketTypeAsianHandicap:
		// AH typically has tighter ranges around evens
		if odds < 1.80 || odds > 2.20 {
			return errors.New("Asian handicap odds typically between 1.80-2.20")
		}
	}

	return nil
}

func (v *footballOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *footballOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *footballOddsValidator) IsPush(odds float64) bool {
	return false
}

// NFLOddsValidator validates NFL-specific odds ranges.
type nflOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newNFLOddsValidator(mt MarketType) OddsValidator {
	return &nflOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    1000.0,
	}
}

func (v *nflOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("NFL odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}

	switch v.marketType {
	case MarketTypeSpread, MarketTypeTotal:
		// Standard NFL spreads are typically between 1.85-2.05
		if odds < 1.50 || odds > 3.00 {
			return errors.New("unusual odds for NFL spread/total")
		}
	case MarketTypeMoneyline:
		// Moneylines can be more extreme
		if odds > 500.0 {
			return errors.New("extreme moneyline odds")
		}
	case MarketTypePlayerPassingYards, MarketTypePlayerRushingYards, MarketTypePlayerTouchdowns:
		// Prop odds usually between 1.20 and 20.0
		if odds < 1.20 {
			return errors.New("prop odds too low")
		}
	}

	return nil
}

func (v *nflOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *nflOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *nflOddsValidator) IsPush(odds float64) bool {
	// NFL spreads with -110 on both sides push at whole numbers
	return false
}

// NBAOddsValidator validates NBA-specific odds ranges.
type nbaOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newNBAOddsValidator(mt MarketType) OddsValidator {
	return &nbaOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    1000.0,
	}
}

func (v *nbaOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("NBA odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}

	switch v.marketType {
	case MarketTypeNBASpread:
		// NBA spreads typically 1.85-2.05
		if odds < 1.50 || odds > 3.00 {
			return errors.New("unusual odds for NBA spread")
		}
	case MarketTypePlayerPoints, MarketTypePlayerRebounds, MarketTypePlayerAssists:
		// Props typically 1.20-20.0
		if odds < 1.20 {
			return errors.New("prop odds too low")
		}
	}

	return nil
}

func (v *nbaOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *nbaOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *nbaOddsValidator) IsPush(odds float64) bool {
	return false
}

// MLBOddsValidator validates MLB-specific odds ranges.
type mlbOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newMLBOddsValidator(mt MarketType) OddsValidator {
	return &mlbOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    1000.0,
	}
}

func (v *mlbOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("MLB odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}

	switch v.marketType {
	case MarketTypeRunLine:
		// Run lines typically around 1.85-2.05
		if odds < 1.50 || odds > 3.00 {
			return errors.New("unusual odds for run line")
		}
	case MarketTypePlayerStrikeouts, MarketTypePlayerHits, MarketTypePlayerHR:
		// Props typically 1.20-20.0
		if odds < 1.20 {
			return errors.New("prop odds too low")
		}
	}

	return nil
}

func (v *mlbOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *mlbOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *mlbOddsValidator) IsPush(odds float64) bool {
	return false
}

// NHLOddsValidator validates NHL-specific odds ranges.
type nhlOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newNHLOddsValidator(mt MarketType) OddsValidator {
	return &nhlOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    1000.0,
	}
}

func (v *nhlOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("NHL odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}

	switch v.marketType {
	case MarketTypePuckLine:
		// Puck lines typically 1.85-2.05
		if odds < 1.50 || odds > 3.00 {
			return errors.New("unusual odds for puck line")
		}
	case MarketTypePlayerShots:
		// Props typically 1.20-20.0
		if odds < 1.20 {
			return errors.New("prop odds too low")
		}
	}

	return nil
}

func (v *nhlOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *nhlOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *nhlOddsValidator) IsPush(odds float64) bool {
	return false
}

// TennisOddsValidator validates tennis-specific odds ranges.
type tennisOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newTennisOddsValidator(mt MarketType) OddsValidator {
	return &tennisOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    500.0,
	}
}

func (v *tennisOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("tennis odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}
	return nil
}

func (v *tennisOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *tennisOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *tennisOddsValidator) IsPush(odds float64) bool {
	return false
}

// CombatOddsValidator validates combat sport-specific odds ranges.
type combatOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newCombatOddsValidator(mt MarketType) OddsValidator {
	return &combatOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    100.0, // Combat odds rarely exceed this
	}
}

func (v *combatOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("combat odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}

	switch v.marketType {
	case MarketTypeRoundBetting:
		// Round betting typically 1.50-10.0
		if odds < 1.50 || odds > 50.0 {
			return errors.New("unusual odds for round betting")
		}
	case MarketTypeMethodOfVictory:
		// MOV can be more spread out
		if odds > 100.0 {
			return errors.New("unusual odds for method of victory")
		}
	}

	return nil
}

func (v *combatOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *combatOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *combatOddsValidator) IsPush(odds float64) bool {
	return false
}

// EsportsOddsValidator validates esports-specific odds ranges.
type esportsOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newEsportsOddsValidator(mt MarketType) OddsValidator {
	return &esportsOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    100.0,
	}
}

func (v *esportsOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("esports odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}

	switch v.marketType {
	case MarketTypeMapWinner, MarketTypeMapHandicap:
		// Map markets typically 1.50-3.00
		if odds < 1.20 || odds > 50.0 {
			return errors.New("unusual odds for map market")
		}
	}

	return nil
}

func (v *esportsOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *esportsOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *esportsOddsValidator) IsPush(odds float64) bool {
	return false
}

// CrossOddsValidator validates cross-sport odds ranges.
type crossOddsValidator struct {
	marketType MarketType
	minOdds    float64
	maxOdds    float64
}

func newCrossOddsValidator(mt MarketType) OddsValidator {
	return &crossOddsValidator{
		marketType: mt,
		minOdds:    1.01,
		maxOdds:    1000.0, // Futures can have extreme odds
	}
}

func (v *crossOddsValidator) ValidateOdds(odds float64) error {
	if odds < v.minOdds || odds > v.maxOdds {
		return fmt.Errorf("cross-sport odds out of range: %.2f (valid range: %.2f - %.2f)",
			odds, v.minOdds, v.maxOdds)
	}
	return nil
}

func (v *crossOddsValidator) GetMinOdds() float64 {
	return v.minOdds
}

func (v *crossOddsValidator) GetMaxOdds() float64 {
	return v.maxOdds
}

func (v *crossOddsValidator) IsPush(odds float64) bool {
	return false
}

// ValidateSelectionOdds validates a complete set of selection odds.
func ValidateSelectionOdds(marketType MarketType, selections []SettlementSelection) error {
	factory := &OddsValidationFactory{}
	validator, err := factory.GetValidator(marketType)
	if err != nil {
		return err
	}

	for _, sel := range selections {
		if err := validator.ValidateOdds(sel.OddsDec); err != nil {
			return fmt.Errorf("invalid odds for selection %s: %w", sel.Name, err)
		}
	}

	return nil
}

// CalculateImpliedProbability converts decimal odds to implied probability.
func CalculateImpliedProbability(oddsDecimal float64) float64 {
	if oddsDecimal <= 1.0 {
		return 0.0
	}
	return 1.0 / oddsDecimal
}

// CalculateOverround calculates the overround (margin) from a set of odds.
func CalculateOverround(oddsDecimal []float64) float64 {
	total := 0.0
	for _, odds := range oddsDecimal {
		if odds > 1.0 {
			total += 1.0 / odds
		}
	}
	return (total - 1.0) * 100.0 // Return as percentage
}
