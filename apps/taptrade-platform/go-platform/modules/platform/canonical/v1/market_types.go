package v1

// MarketType represents different betting market categories and variants.
type MarketType string

// Football/Soccer Market Types
const (
	// MarketType1X2 - Match result (Home Win, Draw, Away Win)
	MarketType1X2 MarketType = "football:1x2"
	// MarketTypeOverUnder - Total goals above/below threshold
	MarketTypeOverUnder MarketType = "football:over_under"
	// MarketTypeBTTS - Both Teams To Score
	MarketTypeBTTS MarketType = "football:btts"
	// MarketTypeAsianHandicap - Asian handicap with fractional line
	MarketTypeAsianHandicap MarketType = "football:asian_handicap"
	// MarketTypeCorrectScore - Exact final score prediction
	MarketTypeCorrectScore MarketType = "football:correct_score"
	// MarketTypeHalftimeResult - Half-time match result
	MarketTypeHalftimeResult MarketType = "football:halftime_result"
	// MarketTypeGoalscorer - Next goal scorer or any-time goal scorer
	MarketTypeGoalscorer MarketType = "football:goalscorer"
	// MarketTypeCorners - Total corners over/under or cornering team
	MarketTypeCorners MarketType = "football:corners"
	// MarketTypeCards - Yellow/red cards for team or player
	MarketTypeCards MarketType = "football:cards"
	// MarketTypeDoubleChance - Win or Draw outcomes combined
	MarketTypeDoubleChance MarketType = "football:double_chance"
	// MarketTypeDrawNoBet - Win market excluding draw option
	MarketTypeDrawNoBet MarketType = "football:draw_no_bet"
)

// NFL/NCAAF Market Types
const (
	// MarketTypeSpread - Point spread betting
	MarketTypeSpread MarketType = "nfl:spread"
	// MarketTypeTotal - Over/under total points
	MarketTypeTotal MarketType = "nfl:total"
	// MarketTypeMoneyline - Straight win/loss moneyline
	MarketTypeMoneyline MarketType = "nfl:moneyline"
	// MarketTypeHalfSpread - First half point spread
	MarketTypeHalfSpread MarketType = "nfl:half_spread"
	// MarketTypeQuarterSpread - Single quarter point spread
	MarketTypeQuarterSpread MarketType = "nfl:quarter_spread"
	// MarketTypePlayerPassingYards - Player passing yards over/under
	MarketTypePlayerPassingYards MarketType = "nfl:player_passing_yards"
	// MarketTypePlayerRushingYards - Player rushing yards over/under
	MarketTypePlayerRushingYards MarketType = "nfl:player_rushing_yards"
	// MarketTypePlayerTouchdowns - Player touchdown pass/rush markets
	MarketTypePlayerTouchdowns MarketType = "nfl:player_touchdowns"
	// MarketTypeFirstTD - First touchdown scorer
	MarketTypeFirstTD MarketType = "nfl:first_td"
)

// NBA/NCAAB Market Types
const (
	// MarketTypeNBASpread - Point spread for basketball
	MarketTypeNBASpread MarketType = "nba:spread"
	// MarketTypeNBATotal - Over/under total points for basketball
	MarketTypeNBATotal MarketType = "nba:total"
	// MarketTypeNBAMoneyline - Moneyline for basketball
	MarketTypeNBAMoneyline MarketType = "nba:moneyline"
	// MarketTypeQuarterLines - Single quarter spread/total
	MarketTypeQuarterLines MarketType = "nba:quarter_lines"
	// MarketTypePlayerPoints - Player points over/under
	MarketTypePlayerPoints MarketType = "nba:player_points"
	// MarketTypePlayerRebounds - Player rebounds over/under
	MarketTypePlayerRebounds MarketType = "nba:player_rebounds"
	// MarketTypePlayerAssists - Player assists over/under
	MarketTypePlayerAssists MarketType = "nba:player_assists"
	// MarketTypeFirstBasket - First basket scorer
	MarketTypeFirstBasket MarketType = "nba:first_basket"
)

// MLB Market Types
const (
	// MarketTypeRunLine - Run line betting (similar to spread)
	MarketTypeRunLine MarketType = "mlb:run_line"
	// MarketTypeMLBTotal - Over/under total runs
	MarketTypeMLBTotal MarketType = "mlb:total"
	// MarketTypeMLBMoneyline - Moneyline for baseball
	MarketTypeMLBMoneyline MarketType = "mlb:moneyline"
	// MarketTypeInningsMarkets - Single inning run/spread markets
	MarketTypeInningsMarkets MarketType = "mlb:innings_markets"
	// MarketTypePlayerHits - Player hits over/under
	MarketTypePlayerHits MarketType = "mlb:player_hits"
	// MarketTypePlayerStrikeouts - Pitcher strikeouts over/under
	MarketTypePlayerStrikeouts MarketType = "mlb:player_strikeouts"
	// MarketTypePlayerHR - Player home runs over/under
	MarketTypePlayerHR MarketType = "mlb:player_hr"
)

// NHL Market Types
const (
	// MarketTypePuckLine - Puck line betting (similar to spread)
	MarketTypePuckLine MarketType = "nhl:puck_line"
	// MarketTypeNHLTotal - Over/under total goals
	MarketTypeNHLTotal MarketType = "nhl:total"
	// MarketTypeNHLMoneyline - Moneyline for hockey
	MarketTypeNHLMoneyline MarketType = "nhl:moneyline"
	// MarketTypePeriodMarkets - Single period spread/moneyline
	MarketTypePeriodMarkets MarketType = "nhl:period_markets"
	// MarketTypeFirstGoal - First goal scorer
	MarketTypeFirstGoal MarketType = "nhl:first_goal"
	// MarketTypePlayerShots - Player shots on goal over/under
	MarketTypePlayerShots MarketType = "nhl:player_shots"
)

// Tennis Market Types
const (
	// MarketTypeMatchWinner - Match winner (straightforward)
	MarketTypeMatchWinner MarketType = "tennis:match_winner"
	// MarketTypeSetBetting - Individual set winner
	MarketTypeSetBetting MarketType = "tennis:set_betting"
	// MarketTypeGameHandicap - Game spread in set or match
	MarketTypeGameHandicap MarketType = "tennis:game_handicap"
	// MarketTypeTotalGames - Total games over/under in match/set
	MarketTypeTotalGames MarketType = "tennis:total_games"
	// MarketTypeSetScore - Exact set score prediction
	MarketTypeSetScore MarketType = "tennis:set_score"
)

// UFC/Boxing Market Types
const (
	// MarketTypeMethodOfVictory - How fight will be decided (KO/TKO/Decision/Submission)
	MarketTypeMethodOfVictory MarketType = "combat:method_of_victory"
	// MarketTypeRoundBetting - Which round will contain decision
	MarketTypeRoundBetting MarketType = "combat:round_betting"
	// MarketTypeFightTotal - Over/under rounds or rounds + outcome
	MarketTypeFightTotal MarketType = "combat:fight_total"
	// MarketTypeToGoDistance - Will fight go the distance
	MarketTypeToGoDistance MarketType = "combat:to_go_distance"
)

// Esports Market Types
const (
	// MarketTypeMapWinner - Map winner in best-of series
	MarketTypeMapWinner MarketType = "esports:map_winner"
	// MarketTypeMapHandicap - Map spread betting
	MarketTypeMapHandicap MarketType = "esports:map_handicap"
	// MarketTypeMapTotal - Total rounds/kills/objectives over/under
	MarketTypeMapTotal MarketType = "esports:map_total"
	// MarketTypeFirstBlood - First kill/first map objective
	MarketTypeFirstBlood MarketType = "esports:first_blood"
	// MarketTypeTotalKills - Team total kills over/under
	MarketTypeTotalKills MarketType = "esports:total_kills"
)

// Cross-Sport Market Types
const (
	// MarketTypeOutright - League/tournament winner betting
	MarketTypeOutright MarketType = "cross:outright"
	// MarketTypeFutures - Season-long outcomes (MVP, team record, etc.)
	MarketTypeFutures MarketType = "cross:futures"
)

// MarketTypeCategory returns the sport category for a market type.
func (mt MarketType) Category() string {
	str := string(mt)
	parts := splitMarketType(str)
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// MarketTypeVariant returns the specific variant for a market type.
func (mt MarketType) Variant() string {
	str := string(mt)
	parts := splitMarketType(str)
	if len(parts) > 1 {
		return parts[1]
	}
	return ""
}

// IsValid checks if the market type is recognized.
func (mt MarketType) IsValid() bool {
	validTypes := getAllValidMarketTypes()
	for _, valid := range validTypes {
		if mt == valid {
			return true
		}
	}
	return false
}

// IsFootballMarket checks if this is a football/soccer market.
func (mt MarketType) IsFootballMarket() bool {
	return mt.Category() == "football"
}

// IsFootballMarket checks if this is an NFL/NCAAF market.
func (mt MarketType) IsNFLMarket() bool {
	return mt.Category() == "nfl"
}

// IsNBAMarket checks if this is an NBA/NCAAB market.
func (mt MarketType) IsNBAMarket() bool {
	return mt.Category() == "nba"
}

// IsMLBMarket checks if this is an MLB market.
func (mt MarketType) IsMLBMarket() bool {
	return mt.Category() == "mlb"
}

// IsNHLMarket checks if this is an NHL market.
func (mt MarketType) IsNHLMarket() bool {
	return mt.Category() == "nhl"
}

// IsTennisMarket checks if this is a tennis market.
func (mt MarketType) IsTennisMarket() bool {
	return mt.Category() == "tennis"
}

// IsCombatMarket checks if this is a UFC/Boxing market.
func (mt MarketType) IsCombatMarket() bool {
	return mt.Category() == "combat"
}

// IsEsportsMarket checks if this is an esports market.
func (mt MarketType) IsEsportsMarket() bool {
	return mt.Category() == "esports"
}

// IsCrossMarket checks if this is a cross-sport market.
func (mt MarketType) IsCrossMarket() bool {
	return mt.Category() == "cross"
}

func splitMarketType(str string) []string {
	// Split on colon to separate category from variant
	parts := make([]string, 0, 2)
	for i, ch := range str {
		if ch == ':' {
			if i > 0 {
				parts = append(parts, str[:i])
				if i < len(str)-1 {
					parts = append(parts, str[i+1:])
				}
			}
			break
		}
	}
	return parts
}

func getAllValidMarketTypes() []MarketType {
	return []MarketType{
		// Football
		MarketType1X2,
		MarketTypeOverUnder,
		MarketTypeBTTS,
		MarketTypeAsianHandicap,
		MarketTypeCorrectScore,
		MarketTypeHalftimeResult,
		MarketTypeGoalscorer,
		MarketTypeCorners,
		MarketTypeCards,
		MarketTypeDoubleChance,
		MarketTypeDrawNoBet,
		// NFL
		MarketTypeSpread,
		MarketTypeTotal,
		MarketTypeMoneyline,
		MarketTypeHalfSpread,
		MarketTypeQuarterSpread,
		MarketTypePlayerPassingYards,
		MarketTypePlayerRushingYards,
		MarketTypePlayerTouchdowns,
		MarketTypeFirstTD,
		// NBA
		MarketTypeNBASpread,
		MarketTypeNBATotal,
		MarketTypeNBAMoneyline,
		MarketTypeQuarterLines,
		MarketTypePlayerPoints,
		MarketTypePlayerRebounds,
		MarketTypePlayerAssists,
		MarketTypeFirstBasket,
		// MLB
		MarketTypeRunLine,
		MarketTypeMLBTotal,
		MarketTypeMLBMoneyline,
		MarketTypeInningsMarkets,
		MarketTypePlayerHits,
		MarketTypePlayerStrikeouts,
		MarketTypePlayerHR,
		// NHL
		MarketTypePuckLine,
		MarketTypeNHLTotal,
		MarketTypeNHLMoneyline,
		MarketTypePeriodMarkets,
		MarketTypeFirstGoal,
		MarketTypePlayerShots,
		// Tennis
		MarketTypeMatchWinner,
		MarketTypeSetBetting,
		MarketTypeGameHandicap,
		MarketTypeTotalGames,
		MarketTypeSetScore,
		// Combat
		MarketTypeMethodOfVictory,
		MarketTypeRoundBetting,
		MarketTypeFightTotal,
		MarketTypeToGoDistance,
		// Esports
		MarketTypeMapWinner,
		MarketTypeMapHandicap,
		MarketTypeMapTotal,
		MarketTypeFirstBlood,
		MarketTypeTotalKills,
		// Cross-sport
		MarketTypeOutright,
		MarketTypeFutures,
	}
}
