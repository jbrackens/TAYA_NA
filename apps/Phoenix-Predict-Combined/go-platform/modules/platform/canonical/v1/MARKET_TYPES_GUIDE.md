# Market Types Extension Guide

## Overview

This document describes the comprehensive market type extensions added to the Phoenix Sportsbook Go backend's canonical schema. The extension provides support for market types across all major sports with settlement resolution, odds validation, and type-safe abstractions.

## Files Added

### 1. market_types.go (11KB)
Defines all market type constants organized by sport category.

**Market Type Categories:**
- **Football/Soccer**: 1X2, OverUnder, BTTS, AsianHandicap, CorrectScore, HalftimeResult, Goalscorer, Corners, Cards, DoubleChance, DrawNoBet
- **NFL/NCAAF**: Spread, Total, Moneyline, HalfSpread, QuarterSpread, PlayerPassingYards, PlayerRushingYards, PlayerTouchdowns, FirstTD
- **NBA/NCAAB**: Spread, Total, Moneyline, QuarterLines, PlayerPoints, PlayerRebounds, PlayerAssists, FirstBasket
- **MLB**: RunLine, Total, Moneyline, InningsMarkets, PlayerHits, PlayerStrikeouts, PlayerHR
- **NHL**: PuckLine, Total, Moneyline, PeriodMarkets, FirstGoal, PlayerShots
- **Tennis**: MatchWinner, SetBetting, GameHandicap, TotalGames, SetScore
- **UFC/Boxing**: MethodOfVictory, RoundBetting, FightTotal, ToGoDistance
- **Esports**: MapWinner, MapHandicap, MapTotal, FirstBlood, TotalKills
- **Cross-Sport**: Outright, Futures

**Key Methods:**
- `(mt MarketType).Category()` - Returns sport category
- `(mt MarketType).Variant()` - Returns market variant
- `(mt MarketType).IsValid()` - Validates market type
- Sport-specific checks: `IsFootballMarket()`, `IsNFLMarket()`, `IsNBAMarket()`, etc.

### 2. settlement.go (22KB)
Implements settlement resolution logic for each market type.

**Core Components:**
- `SettlementResolver` interface with `Resolve()` method
- `SettlementResolverFactory` for creating sport-specific resolvers
- Sport-specific resolver implementations:
  - `footballResolver` - Handles 1X2, BTTS, AsianHandicap, OverUnder, CorrectScore, HalftimeResult
  - `nflResolver` - Handles Spread, Total, Moneyline
  - `nbaResolver`, `mlbResolver`, `nhlResolver`, `tennisResolver`, `combatResolver`, `esportsResolver`, `crossResolver`

**Settlement Features:**
- Void market handling with reasons
- Push/Tie conditions (Asian Handicap, Spreads, Totals)
- Dead heat factors for multi-way markets
- Result source tracking
- Comprehensive error handling

**Example Usage:**
```go
factory := &SettlementResolverFactory{}
resolver, err := factory.GetResolver(MarketType1X2)
resolution, err := resolver.Resolve(&MarketSettlementData{
    MarketType: MarketType1X2,
    Selections: []SettlementSelection{...},
    ResultData: map[string]interface{}{"homeGoals": 2, "awayGoals": 1},
})
```

### 3. odds_validation.go (13KB)
Implements odds range validation for each market type.

**Core Components:**
- `OddsValidator` interface with validation methods
- `OddsValidationFactory` for creating sport-specific validators
- Sport-specific validators with market-type-aware ranges:
  - Football: 1.01-500.0 (strict for 1X2, tight for Asian Handicap)
  - NFL: 1.01-1000.0 (restricted spreads/totals, flexible props)
  - NBA: 1.01-1000.0 (prop-specific ranges)
  - MLB: 1.01-1000.0 (prop validation)
  - NHL: 1.01-1000.0 (prop validation)
  - Tennis: 1.01-500.0
  - Combat: 1.01-100.0 (round betting, MOV specific)
  - Esports: 1.01-100.0 (map market specific)
  - Cross-Sport: 1.01-1000.0 (futures can be extreme)

**Utility Functions:**
- `CalculateImpliedProbability(odds float64)` - Converts decimal odds to probability
- `CalculateOverround(odds []float64)` - Calculates bookmaker margin
- `ValidateSelectionOdds(marketType, selections)` - Batch validation

**Example Usage:**
```go
validator, err := factory.GetValidator(MarketTypeSpread)
if err := validator.ValidateOdds(1.91); err != nil {
    // Handle validation error
}
probability := CalculateImpliedProbability(2.0) // Returns 0.5
overround := CalculateOverround([]float64{1.91, 1.91}) // Returns ~4.7%
```

### 4. settlement_test.go (15KB)
Comprehensive test suite for settlement resolvers.

**Test Coverage:**
- Football settlement: 1X2, BTTS, OverUnder, AsianHandicap, CorrectScore, HalftimeResult
- NFL settlement: Spread, Total, Moneyline
- Void market handling
- Market type validation
- Market type categorization
- Sport-specific checks
- Factory pattern verification

**Total Tests:** 25+ test cases

### 5. odds_validation_test.go (12KB)
Comprehensive test suite for odds validation.

**Test Coverage:**
- Default validation ranges
- Football-specific ranges and Asian Handicap rules
- NFL spread/total/prop validation
- NBA spread/prop validation
- MLB prop validation
- NHL prop validation
- Tennis validation
- Combat sport validation
- Esports validation
- Cross-sport validation
- Factory pattern verification
- Implied probability calculation
- Overround calculation
- Batch selection validation

**Total Tests:** 30+ test cases

## Updated Files

### sports_handlers.go
Extended sport descriptors to include all major sports:
- Added: `ncaa_basketball`, `boxing`, `nhl`, `tennis`, `golf`, `cricket`, `soccer`, `rugby`
- Updated `fixtureSportKey()` to detect all new sports from tournament names
- Maintains backward compatibility with existing sports

## Architecture & Design Patterns

### 1. Factory Pattern
Both settlement and odds validation use factory patterns to provide sport-specific implementations:
```go
factory := &SettlementResolverFactory{}
resolver, err := factory.GetResolver(marketType)

factory := &OddsValidationFactory{}
validator, err := factory.GetValidator(marketType)
```

### 2. Type Safety
Market types are strongly typed constants with methods:
```go
marketType := MarketType1X2
if marketType.IsFootballMarket() { ... }
category := marketType.Category()  // Returns "football"
variant := marketType.Variant()    // Returns "1x2"
```

### 3. Extensibility
Adding new market types is simple:
1. Add constant in `market_types.go`
2. Add factory case in settlement/validation factories
3. Implement sport-specific resolver/validator
4. Add tests

### 4. Error Handling
- Factory methods return errors for unknown market types
- Validation returns errors with specific messages
- Settlement returns void outcomes with reasons

## Integration Points

### With Domain Models
Market types are designed to extend the existing `Market` struct:
```go
type Market struct {
    MarketID      string            `json:"marketId"`
    Name          string            `json:"name"`
    Specifiers    map[string]string `json:"specifiers,omitempty"`  // Can include market type
    Selections    []Selection       `json:"selections,omitempty"`
    // ... existing fields
}
```

### With Canonical Schema
Compatible with existing canonical v1 schema:
- Uses `SettlementOutcome` and `SettlementResolution` types from types.go
- Integrates with existing `Market` and `Selection` models
- Extends without breaking existing functionality

### With Sports Handlers
Updated `sports_handlers.go` to:
- Recognize all new sports from tournament names
- Maintain normalized sport keys across catalog
- Support deep filtering by sport in API endpoints

## Testing

All test files follow Go testing conventions with:
- Table-driven tests for parametric validation
- Clear test names describing scenarios
- Comprehensive edge case coverage
- Parallel-safe test isolation

Run tests:
```bash
go test ./modules/platform/canonical/v1/... -v
```

## Future Enhancements

### Potential Additions
1. **Rule-based Settlement**: Complex rules for conditional settlement (e.g., "if match goes extra time")
2. **Live Settlement Adjustments**: Support for in-play market updates
3. **Multi-branch Markets**: Markets with shared winning selections
4. **Dynamic Odds Calculation**: Automatic odds generation based on probabilities
5. **Localization**: Translate market names/variants by locale
6. **Market Metadata**: Additional properties like minimum stake, maximum stake per variant

### Performance Optimization
1. Cache validator/resolver instances
2. Pre-compile market type validation regexes
3. Optimize overround calculation for large selection sets

## Usage Examples

### Settlement Example
```go
// Resolve a 1X2 market with final score 2-1
resolver, _ := factory.GetResolver(MarketType1X2)
resolution, _ := resolver.Resolve(&MarketSettlementData{
    Selections: []SettlementSelection{
        {ID: "h", Name: "1", OddsDec: 2.0},
        {ID: "d", Name: "X", OddsDec: 3.5},
        {ID: "a", Name: "2", OddsDec: 4.0},
    },
    ResultData: map[string]interface{}{
        "homeGoals": 2,
        "awayGoals": 1,
    },
})
// resolution.Outcome == SettlementOutcomeWin
// resolution.WinningSelections == []string{"h"}
```

### Validation Example
```go
// Validate odds for an NFL spread
validator, _ := factory.GetValidator(MarketTypeSpread)
if err := validator.ValidateOdds(1.91); err == nil {
    // Valid odds
}

// Calculate implied probabilities
prob1 := CalculateImpliedProbability(2.0)   // 0.5
prob2 := CalculateImpliedProbability(3.0)   // 0.333
overround := CalculateOverround([]float64{2.0, 3.0}) // ~16.7%
```

## Conclusion

This comprehensive extension provides a robust, type-safe system for handling market types across all major sports. The modular design allows easy extension for new sports and market types while maintaining integration with the existing canonical schema.
