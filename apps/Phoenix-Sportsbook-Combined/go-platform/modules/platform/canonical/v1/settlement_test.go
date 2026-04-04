package v1

import (
	"testing"
)

func TestFootballSettlementResolver1X2(t *testing.T) {
	factory := &SettlementResolverFactory{}
	resolver, err := factory.GetResolver(MarketType1X2)
	if err != nil {
		t.Fatalf("Failed to get resolver: %v", err)
	}

	tests := []struct {
		name           string
		homeGoals      int
		awayGoals      int
		expectedResult string
		expectVoid     bool
	}{
		{
			name:           "Home win",
			homeGoals:      3,
			awayGoals:      1,
			expectedResult: "1",
			expectVoid:     false,
		},
		{
			name:           "Draw",
			homeGoals:      2,
			awayGoals:      2,
			expectedResult: "X",
			expectVoid:     false,
		},
		{
			name:           "Away win",
			homeGoals:      0,
			awayGoals:      2,
			expectedResult: "2",
			expectVoid:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := &MarketSettlementData{
				MarketType: MarketType1X2,
				Selections: []SettlementSelection{
					{ID: "sel1", Name: "1", OddsDec: 2.0},
					{ID: "sel2", Name: "X", OddsDec: 3.5},
					{ID: "sel3", Name: "2", OddsDec: 4.0},
				},
				ResultData: map[string]interface{}{
					"homeGoals": tt.homeGoals,
					"awayGoals": tt.awayGoals,
				},
			}

			resolution, err := resolver.Resolve(data)
			if err != nil {
				t.Fatalf("Resolve failed: %v", err)
			}

			if resolution.Outcome == SettlementOutcomeVoid && !tt.expectVoid {
				t.Errorf("Expected outcome, got void: %s", resolution.Reason)
			}

			if resolution.Outcome != SettlementOutcomeVoid && len(resolution.WinningSelections) == 0 {
				t.Errorf("Expected winning selections, got none")
			}
		})
	}
}

func TestFootballSettlementResolverBTTS(t *testing.T) {
	factory := &SettlementResolverFactory{}
	resolver, err := factory.GetResolver(MarketTypeBTTS)
	if err != nil {
		t.Fatalf("Failed to get resolver: %v", err)
	}

	tests := []struct {
		name           string
		homeGoals      int
		awayGoals      int
		expectedResult string
	}{
		{
			name:           "Both teams score",
			homeGoals:      2,
			awayGoals:      1,
			expectedResult: "Yes",
		},
		{
			name:           "Only home scores",
			homeGoals:      2,
			awayGoals:      0,
			expectedResult: "No",
		},
		{
			name:           "Only away scores",
			homeGoals:      0,
			awayGoals:      3,
			expectedResult: "No",
		},
		{
			name:           "Neither team scores",
			homeGoals:      0,
			awayGoals:      0,
			expectedResult: "No",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := &MarketSettlementData{
				MarketType: MarketTypeBTTS,
				Selections: []SettlementSelection{
					{ID: "sel1", Name: "Yes", OddsDec: 2.0},
					{ID: "sel2", Name: "No", OddsDec: 1.8},
				},
				ResultData: map[string]interface{}{
					"homeGoals": tt.homeGoals,
					"awayGoals": tt.awayGoals,
				},
			}

			resolution, err := resolver.Resolve(data)
			if err != nil {
				t.Fatalf("Resolve failed: %v", err)
			}

			if resolution.Outcome == SettlementOutcomeVoid {
				t.Errorf("Expected outcome, got void: %s", resolution.Reason)
			}

			if len(resolution.WinningSelections) == 0 {
				t.Errorf("Expected winning selections, got none")
			}
		})
	}
}

func TestFootballSettlementResolverOverUnder(t *testing.T) {
	factory := &SettlementResolverFactory{}
	resolver, err := factory.GetResolver(MarketTypeOverUnder)
	if err != nil {
		t.Fatalf("Failed to get resolver: %v", err)
	}

	tests := []struct {
		name           string
		homeGoals      int
		awayGoals      int
		threshold      float64
		expectedResult string
		expectPush     bool
	}{
		{
			name:           "Over 2.5",
			homeGoals:      2,
			awayGoals:      1,
			threshold:      2.5,
			expectedResult: "Over",
			expectPush:     false,
		},
		{
			name:           "Under 2.5",
			homeGoals:      1,
			awayGoals:      0,
			threshold:      2.5,
			expectedResult: "Under",
			expectPush:     false,
		},
		{
			name:           "Push at 2.5",
			homeGoals:      2,
			awayGoals:      0,
			threshold:      2.0,
			expectedResult: "",
			expectPush:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := &MarketSettlementData{
				MarketType: MarketTypeOverUnder,
				Selections: []SettlementSelection{
					{ID: "sel1", Name: "Over", OddsDec: 1.9},
					{ID: "sel2", Name: "Under", OddsDec: 1.9},
				},
				ResultData: map[string]interface{}{
					"homeGoals": tt.homeGoals,
					"awayGoals": tt.awayGoals,
					"threshold": tt.threshold,
				},
			}

			resolution, err := resolver.Resolve(data)
			if err != nil {
				t.Fatalf("Resolve failed: %v", err)
			}

			if tt.expectPush {
				if resolution.Outcome != SettlementOutcomePush {
					t.Errorf("Expected push, got %v", resolution.Outcome)
				}
			} else if resolution.Outcome == SettlementOutcomeVoid {
				t.Errorf("Expected outcome, got void: %s", resolution.Reason)
			}
		})
	}
}

func TestFootballSettlementResolverAsianHandicap(t *testing.T) {
	factory := &SettlementResolverFactory{}
	resolver, err := factory.GetResolver(MarketTypeAsianHandicap)
	if err != nil {
		t.Fatalf("Failed to get resolver: %v", err)
	}

	tests := []struct {
		name           string
		homeGoals      int
		awayGoals      int
		handicap       float64
		expectedResult string
	}{
		{
			name:           "Home wins with +0.5 handicap",
			homeGoals:      0,
			awayGoals:      0,
			handicap:       0.5,
			expectedResult: "Home",
		},
		{
			name:           "Away wins with -0.5 handicap",
			homeGoals:      1,
			awayGoals:      1,
			handicap:       -0.5,
			expectedResult: "Away",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := &MarketSettlementData{
				MarketType: MarketTypeAsianHandicap,
				Selections: []SettlementSelection{
					{ID: "sel1", Name: "Home", OddsDec: 1.95},
					{ID: "sel2", Name: "Away", OddsDec: 1.95},
				},
				ResultData: map[string]interface{}{
					"homeGoals": tt.homeGoals,
					"awayGoals": tt.awayGoals,
					"handicap":  tt.handicap,
				},
			}

			resolution, err := resolver.Resolve(data)
			if err != nil {
				t.Fatalf("Resolve failed: %v", err)
			}

			if resolution.Outcome == SettlementOutcomeVoid {
				t.Errorf("Expected outcome, got void: %s", resolution.Reason)
			}
		})
	}
}

func TestNFLSettlementResolverSpread(t *testing.T) {
	factory := &SettlementResolverFactory{}
	resolver, err := factory.GetResolver(MarketTypeSpread)
	if err != nil {
		t.Fatalf("Failed to get resolver: %v", err)
	}

	tests := []struct {
		name           string
		homeScore      int
		awayScore      int
		spread         float64
		expectedResult string
		expectPush     bool
	}{
		{
			name:           "Home covers -3",
			homeScore:      24,
			awayScore:      20,
			spread:         -3,
			expectedResult: "Home",
			expectPush:     false,
		},
		{
			name:           "Away covers +3",
			homeScore:      24,
			awayScore:      20,
			spread:         -3,
			expectedResult: "Home",
			expectPush:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := &MarketSettlementData{
				MarketType: MarketTypeSpread,
				Selections: []SettlementSelection{
					{ID: "sel1", Name: "Home", OddsDec: 1.91},
					{ID: "sel2", Name: "Away", OddsDec: 1.91},
				},
				ResultData: map[string]interface{}{
					"homeScore": tt.homeScore,
					"awayScore": tt.awayScore,
					"spread":    tt.spread,
				},
			}

			resolution, err := resolver.Resolve(data)
			if err != nil {
				t.Fatalf("Resolve failed: %v", err)
			}

			if tt.expectPush {
				if resolution.Outcome != SettlementOutcomePush {
					t.Errorf("Expected push, got %v", resolution.Outcome)
				}
			} else if resolution.Outcome == SettlementOutcomeVoid {
				t.Errorf("Expected outcome, got void: %s", resolution.Reason)
			}
		})
	}
}

func TestNFLSettlementResolverTotal(t *testing.T) {
	factory := &SettlementResolverFactory{}
	resolver, err := factory.GetResolver(MarketTypeTotal)
	if err != nil {
		t.Fatalf("Failed to get resolver: %v", err)
	}

	tests := []struct {
		name           string
		homeScore      int
		awayScore      int
		threshold      float64
		expectedResult string
	}{
		{
			name:           "Over 45",
			homeScore:      28,
			awayScore:      20,
			threshold:      45,
			expectedResult: "Over",
		},
		{
			name:           "Under 45",
			homeScore:      20,
			awayScore:      18,
			threshold:      45,
			expectedResult: "Under",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := &MarketSettlementData{
				MarketType: MarketTypeTotal,
				Selections: []SettlementSelection{
					{ID: "sel1", Name: "Over", OddsDec: 1.91},
					{ID: "sel2", Name: "Under", OddsDec: 1.91},
				},
				ResultData: map[string]interface{}{
					"homeScore": tt.homeScore,
					"awayScore": tt.awayScore,
					"threshold": tt.threshold,
				},
			}

			resolution, err := resolver.Resolve(data)
			if err != nil {
				t.Fatalf("Resolve failed: %v", err)
			}

			if resolution.Outcome == SettlementOutcomeVoid {
				t.Errorf("Expected outcome, got void: %s", resolution.Reason)
			}
		})
	}
}

func TestVoidMarketSettlement(t *testing.T) {
	factory := &SettlementResolverFactory{}
	resolver, err := factory.GetResolver(MarketType1X2)
	if err != nil {
		t.Fatalf("Failed to get resolver: %v", err)
	}

	data := &MarketSettlementData{
		MarketType: MarketType1X2,
		IsVoid:     true,
		VoidReason: "Match abandoned",
		Selections: []SettlementSelection{
			{ID: "sel1", Name: "1", OddsDec: 2.0},
			{ID: "sel2", Name: "X", OddsDec: 3.5},
			{ID: "sel3", Name: "2", OddsDec: 4.0},
		},
		ResultData: map[string]interface{}{},
	}

	resolution, err := resolver.Resolve(data)
	if err != nil {
		t.Fatalf("Resolve failed: %v", err)
	}

	if resolution.Outcome != SettlementOutcomeVoid {
		t.Errorf("Expected void outcome, got %v", resolution.Outcome)
	}

	if resolution.VoidReason != "Match abandoned" {
		t.Errorf("Expected void reason 'Match abandoned', got %s", resolution.VoidReason)
	}
}

func TestMarketTypeValidation(t *testing.T) {
	tests := []struct {
		marketType MarketType
		isValid    bool
	}{
		{MarketType1X2, true},
		{MarketTypeBTTS, true},
		{MarketTypeSpread, true},
		{MarketTypeMoneyline, true},
		{MarketType("invalid:market"), false},
	}

	for _, tt := range tests {
		t.Run(string(tt.marketType), func(t *testing.T) {
			if tt.marketType.IsValid() != tt.isValid {
				t.Errorf("Expected IsValid=%v, got %v", tt.isValid, tt.marketType.IsValid())
			}
		})
	}
}

func TestMarketTypeCategory(t *testing.T) {
	tests := []struct {
		marketType MarketType
		category   string
	}{
		{MarketType1X2, "football"},
		{MarketTypeSpread, "nfl"},
		{MarketTypePlayerPoints, "nba"},
		{MarketTypeRunLine, "mlb"},
		{MarketTypePuckLine, "nhl"},
		{MarketTypeMatchWinner, "tennis"},
		{MarketTypeMethodOfVictory, "combat"},
		{MarketTypeMapWinner, "esports"},
		{MarketTypeOutright, "cross"},
	}

	for _, tt := range tests {
		t.Run(string(tt.marketType), func(t *testing.T) {
			if category := tt.marketType.Category(); category != tt.category {
				t.Errorf("Expected category %s, got %s", tt.category, category)
			}
		})
	}
}

func TestMarketTypeSportChecks(t *testing.T) {
	tests := []struct {
		marketType      MarketType
		isFootball      bool
		isNFL           bool
		isNBA           bool
		isMLB           bool
		isNHL           bool
		isTennis        bool
		isCombat        bool
		isEsports       bool
		isCross         bool
	}{
		{
			MarketType1X2,
			true, false, false, false, false, false, false, false, false,
		},
		{
			MarketTypeSpread,
			false, true, false, false, false, false, false, false, false,
		},
		{
			MarketTypePlayerPoints,
			false, false, true, false, false, false, false, false, false,
		},
		{
			MarketTypeRunLine,
			false, false, false, true, false, false, false, false, false,
		},
		{
			MarketTypePuckLine,
			false, false, false, false, true, false, false, false, false,
		},
		{
			MarketTypeMatchWinner,
			false, false, false, false, false, true, false, false, false,
		},
		{
			MarketTypeMethodOfVictory,
			false, false, false, false, false, false, true, false, false,
		},
		{
			MarketTypeMapWinner,
			false, false, false, false, false, false, false, true, false,
		},
		{
			MarketTypeOutright,
			false, false, false, false, false, false, false, false, true,
		},
	}

	for _, tt := range tests {
		t.Run(string(tt.marketType), func(t *testing.T) {
			if tt.marketType.IsFootballMarket() != tt.isFootball {
				t.Errorf("IsFootballMarket: expected %v, got %v", tt.isFootball, tt.marketType.IsFootballMarket())
			}
			if tt.marketType.IsNFLMarket() != tt.isNFL {
				t.Errorf("IsNFLMarket: expected %v, got %v", tt.isNFL, tt.marketType.IsNFLMarket())
			}
			if tt.marketType.IsNBAMarket() != tt.isNBA {
				t.Errorf("IsNBAMarket: expected %v, got %v", tt.isNBA, tt.marketType.IsNBAMarket())
			}
			if tt.marketType.IsMLBMarket() != tt.isMLB {
				t.Errorf("IsMLBMarket: expected %v, got %v", tt.isMLB, tt.marketType.IsMLBMarket())
			}
			if tt.marketType.IsNHLMarket() != tt.isNHL {
				t.Errorf("IsNHLMarket: expected %v, got %v", tt.isNHL, tt.marketType.IsNHLMarket())
			}
			if tt.marketType.IsTennisMarket() != tt.isTennis {
				t.Errorf("IsTennisMarket: expected %v, got %v", tt.isTennis, tt.marketType.IsTennisMarket())
			}
			if tt.marketType.IsCombatMarket() != tt.isCombat {
				t.Errorf("IsCombatMarket: expected %v, got %v", tt.isCombat, tt.marketType.IsCombatMarket())
			}
			if tt.marketType.IsEsportsMarket() != tt.isEsports {
				t.Errorf("IsEsportsMarket: expected %v, got %v", tt.isEsports, tt.marketType.IsEsportsMarket())
			}
			if tt.marketType.IsCrossMarket() != tt.isCross {
				t.Errorf("IsCrossMarket: expected %v, got %v", tt.isCross, tt.marketType.IsCrossMarket())
			}
		})
	}
}

func TestSettlementResolverFactory(t *testing.T) {
	factory := &SettlementResolverFactory{}

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
		{MarketType("invalid:market"), false},
	}

	for _, tt := range tests {
		t.Run(string(tt.marketType), func(t *testing.T) {
			resolver, err := factory.GetResolver(tt.marketType)
			if tt.expectSuccess {
				if err != nil {
					t.Errorf("Expected success, got error: %v", err)
				}
				if resolver == nil {
					t.Errorf("Expected resolver, got nil")
				}
			} else {
				if err == nil {
					t.Errorf("Expected error, got success")
				}
			}
		})
	}
}
