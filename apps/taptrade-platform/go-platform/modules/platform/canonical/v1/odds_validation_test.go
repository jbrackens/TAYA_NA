package v1

import (
	"math"
	"testing"
)

func TestDefaultOddsValidation(t *testing.T) {
	validator := newDefaultOddsValidator()

	tests := []struct {
		odds      float64
		expectErr bool
	}{
		{1.01, false},
		{2.0, false},
		{100.0, false},
		{1000.0, false},
		{1.0, true},
		{0.5, true},
		{1001.0, true},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestFootballOddsValidation(t *testing.T) {
	validator := newFootballOddsValidator(MarketType1X2)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid low odds", 1.5, false},
		{"Valid mid odds", 3.5, false},
		{"Valid high odds", 50.0, false},
		{"Too low", 1.0, true},
		{"Too high", 501.0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestFootballAsianHandicapOdds(t *testing.T) {
	validator := newFootballOddsValidator(MarketTypeAsianHandicap)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid AH odds low", 1.80, false},
		{"Valid AH odds mid", 1.95, false},
		{"Valid AH odds high", 2.20, false},
		{"AH odds too low", 1.50, true},
		{"AH odds too high", 2.50, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestNFLOddsValidation(t *testing.T) {
	validator := newNFLOddsValidator(MarketTypeSpread)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid spread", 1.91, false},
		{"Typical spread", 1.85, false},
		{"Valid high", 2.50, false},
		{"Too low", 1.40, true},
		{"Too high", 3.50, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestNFLPropOddsValidation(t *testing.T) {
	validator := newNFLOddsValidator(MarketTypePlayerPassingYards)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid low prop", 1.20, false},
		{"Valid mid prop", 2.50, false},
		{"Valid high prop", 20.0, false},
		{"Prop too low", 1.10, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestNBAOddsValidation(t *testing.T) {
	validator := newNBAOddsValidator(MarketTypeNBASpread)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid spread", 1.91, false},
		{"Typical spread", 1.85, false},
		{"Valid high", 2.50, false},
		{"Too low", 1.40, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestNBAPlayerPropsValidation(t *testing.T) {
	validator := newNBAOddsValidator(MarketTypePlayerPoints)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid low prop", 1.20, false},
		{"Valid mid prop", 2.00, false},
		{"Valid high prop", 15.0, false},
		{"Prop too low", 1.10, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestMLBOddsValidation(t *testing.T) {
	validator := newMLBOddsValidator(MarketTypeRunLine)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid run line", 1.90, false},
		{"Typical run line", 1.85, false},
		{"Too low", 1.40, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestNHLOddsValidation(t *testing.T) {
	validator := newNHLOddsValidator(MarketTypePuckLine)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid puck line", 1.90, false},
		{"Typical puck line", 1.85, false},
		{"Too low", 1.40, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestTennisOddsValidation(t *testing.T) {
	validator := newTennisOddsValidator(MarketTypeMatchWinner)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid low", 1.5, false},
		{"Valid mid", 3.0, false},
		{"Valid high", 100.0, false},
		{"Too high", 501.0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestCombatOddsValidation(t *testing.T) {
	validator := newCombatOddsValidator(MarketTypeMethodOfVictory)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid low", 1.5, false},
		{"Valid mid", 3.0, false},
		{"Valid high", 50.0, false},
		{"Too high", 101.0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestEsportsOddsValidation(t *testing.T) {
	validator := newEsportsOddsValidator(MarketTypeMapWinner)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid low", 1.5, false},
		{"Valid mid", 2.5, false},
		{"Valid high", 30.0, false},
		{"Too high", 101.0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestCrossOddsValidation(t *testing.T) {
	validator := newCrossOddsValidator(MarketTypeOutright)

	tests := []struct {
		name      string
		odds      float64
		expectErr bool
	}{
		{"Valid low", 1.5, false},
		{"Valid mid", 50.0, false},
		{"Valid high", 500.0, false},
		{"Too high", 1001.0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOdds(tt.odds)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v", tt.expectErr, err != nil)
			}
		})
	}
}

func TestOddsValidationFactory(t *testing.T) {
	factory := &OddsValidationFactory{}

	tests := []struct {
		marketType    MarketType
		expectSuccess bool
	}{
		{MarketType1X2, true},
		{MarketTypeSpread, true},
		{MarketTypePlayerPoints, true},
		{MarketTypeRunLine, true},
		{MarketTypePuckLine, true},
		{MarketTypeMatchWinner, true},
		{MarketTypeMethodOfVictory, true},
		{MarketTypeMapWinner, true},
		{MarketTypeOutright, true},
	}

	for _, tt := range tests {
		t.Run(string(tt.marketType), func(t *testing.T) {
			validator, err := factory.GetValidator(tt.marketType)
			if tt.expectSuccess {
				if err != nil {
					t.Errorf("Expected success, got error: %v", err)
				}
				if validator == nil {
					t.Errorf("Expected validator, got nil")
				}
			} else {
				if err == nil {
					t.Errorf("Expected error, got success")
				}
			}
		})
	}
}

func TestCalculateImpliedProbability(t *testing.T) {
	tests := []struct {
		odds      float64
		expected  float64
		tolerance float64
	}{
		{2.0, 0.5, 0.001},
		{1.5, 0.667, 0.001},
		{3.0, 0.333, 0.001},
		{10.0, 0.1, 0.001},
		{1.01, 0.99, 0.001},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			result := CalculateImpliedProbability(tt.odds)
			if math.Abs(result-tt.expected) > tt.tolerance {
				t.Errorf("For odds %.2f, expected %.3f, got %.3f", tt.odds, tt.expected, result)
			}
		})
	}
}

func TestCalculateImpliedProbabilityEdgeCases(t *testing.T) {
	tests := []struct {
		name    string
		odds    float64
		expected float64
	}{
		{"Odds too low", 1.0, 0.0},
		{"Odds negative", -1.0, 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateImpliedProbability(tt.odds)
			if result != tt.expected {
				t.Errorf("Expected %.3f, got %.3f", tt.expected, result)
			}
		})
	}
}

func TestCalculateOverround(t *testing.T) {
	tests := []struct {
		name              string
		odds              []float64
		expectedAboveZero bool // Should be positive margin
	}{
		{
			"Typical 3-way market",
			[]float64{2.0, 3.5, 4.0},
			true, // 1/2 + 1/3.5 + 1/4 = 0.5 + 0.286 + 0.25 = 1.036, so margin = 3.6%
		},
		{
			"Even money market",
			[]float64{1.91, 1.91},
			true, // 1/1.91 + 1/1.91 = 1.047, so margin = 4.7%
		},
		{
			"Low margin market",
			[]float64{1.95, 1.95},
			true, // 1/1.95 + 1/1.95 = 1.026, so margin = 2.6%
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			overround := CalculateOverround(tt.odds)
			if tt.expectedAboveZero && overround <= 0 {
				t.Errorf("Expected positive overround, got %.2f", overround)
			}
			if overround > 20 {
				t.Errorf("Overround seems too high: %.2f", overround)
			}
		})
	}
}

func TestValidateSelectionOdds(t *testing.T) {
	tests := []struct {
		name       string
		marketType MarketType
		selections []SettlementSelection
		expectErr  bool
	}{
		{
			"Valid football selections",
			MarketType1X2,
			[]SettlementSelection{
				{ID: "1", Name: "1", OddsDec: 2.0},
				{ID: "2", Name: "X", OddsDec: 3.5},
				{ID: "3", Name: "2", OddsDec: 4.0},
			},
			false,
		},
		{
			"Invalid odds in NFL",
			MarketTypeSpread,
			[]SettlementSelection{
				{ID: "1", Name: "Home", OddsDec: 0.5},
				{ID: "2", Name: "Away", OddsDec: 1.91},
			},
			true,
		},
		{
			"Valid NBA props",
			MarketTypePlayerPoints,
			[]SettlementSelection{
				{ID: "1", Name: "Over", OddsDec: 1.50},
				{ID: "2", Name: "Under", OddsDec: 1.50},
			},
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateSelectionOdds(tt.marketType, tt.selections)
			if (err != nil) != tt.expectErr {
				t.Errorf("Expected error=%v, got %v (error: %v)", tt.expectErr, err != nil, err)
			}
		})
	}
}

func TestOddsValidatorMinMaxOdds(t *testing.T) {
	tests := []struct {
		name       string
		validator  OddsValidator
		expectedMin float64
		expectedMax float64
	}{
		{"Default", newDefaultOddsValidator(), 1.01, 1000.0},
		{"Football", newFootballOddsValidator(MarketType1X2), 1.01, 500.0},
		{"NFL", newNFLOddsValidator(MarketTypeSpread), 1.01, 1000.0},
		{"Tennis", newTennisOddsValidator(MarketTypeMatchWinner), 1.01, 500.0},
		{"Combat", newCombatOddsValidator(MarketTypeMethodOfVictory), 1.01, 100.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if min := tt.validator.GetMinOdds(); min != tt.expectedMin {
				t.Errorf("Expected min %.2f, got %.2f", tt.expectedMin, min)
			}
			if max := tt.validator.GetMaxOdds(); max != tt.expectedMax {
				t.Errorf("Expected max %.2f, got %.2f", tt.expectedMax, max)
			}
		})
	}
}
