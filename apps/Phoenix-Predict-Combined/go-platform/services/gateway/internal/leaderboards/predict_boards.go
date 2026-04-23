package leaderboards

// Predict-native board catalog. See PLAN-loyalty-leaderboards.md §2.Leaderboards
// for the product definitions. This file is intentionally the single source of
// truth for board IDs, display names, and qualification thresholds so the
// recomputer, repo, and HTTP layer all agree.

// PredictBoardID is a stable string identifier used as the storage key in
// leaderboard_snapshots.board_id. Category boards are dynamic —
// "category:<slug>" — but share the same schema.
type PredictBoardID = string

const (
	PredictBoardAccuracy  PredictBoardID = "accuracy"
	PredictBoardPnLWeekly PredictBoardID = "pnl_weekly"
	PredictBoardSharpness PredictBoardID = "sharpness"

	predictBoardCategoryPrefix = "category:"
)

// PredictBoardWindow describes the time window the board's metric is computed
// over. rolling_30d is a rolling 30-day lookback; calendar_week resets every
// Monday 00:00 UTC.
type PredictBoardWindow string

const (
	PredictBoardWindowRolling30D PredictBoardWindow = "rolling_30d"
	PredictBoardWindowWeekly     PredictBoardWindow = "weekly"
)

// PredictBoardDef is the shape served to the frontend so it can render the
// sidebar + qualification copy. Category boards are generated at runtime by
// joining this catalog with the active categories.
type PredictBoardDef struct {
	ID               PredictBoardID     `json:"id"`
	Name             string             `json:"name"`
	Description      string             `json:"description"`
	MetricLabel      string             `json:"metricLabel"`
	Window           PredictBoardWindow `json:"window"`
	MinSettled       int                `json:"minSettled"`
	MinVolumeCents   int64              `json:"minVolumeCents,omitempty"`
	CategorySlug     string             `json:"categorySlug,omitempty"`
	QualificationMsg string             `json:"qualificationMsg"`
}

// PredictBoards returns the three static boards. Category Champions boards
// are generated separately by PredictCategoryBoards because they depend on
// the active-categories list.
func PredictBoards() []PredictBoardDef {
	return []PredictBoardDef{
		{
			ID:               PredictBoardAccuracy,
			Name:             "Accuracy",
			Description:      "% of settled markets you called correctly, rolling 30 days.",
			MetricLabel:      "Accuracy",
			Window:           PredictBoardWindowRolling30D,
			MinSettled:       10,
			QualificationMsg: "Settle 10 markets in the last 30 days to qualify.",
		},
		{
			ID:               PredictBoardPnLWeekly,
			Name:             "Weekly P&L",
			Description:      "Realized profit and loss this calendar week.",
			MetricLabel:      "P&L",
			Window:           PredictBoardWindowWeekly,
			MinSettled:       1,
			QualificationMsg: "Settle at least one market this week to qualify.",
		},
		{
			ID:               PredictBoardSharpness,
			Name:             "Sharpness",
			Description:      "Realized P&L divided by total volume traded, rolling 30 days.",
			MetricLabel:      "ROI",
			Window:           PredictBoardWindowRolling30D,
			MinSettled:       5,
			MinVolumeCents:   50_000, // $500 floor keeps tiny-sample noise off the board
			QualificationMsg: "Settle 5 markets with $500+ total volume in the last 30 days.",
		},
	}
}

// PredictCategoryBoardID builds the storage ID for a category board.
func PredictCategoryBoardID(categorySlug string) PredictBoardID {
	return predictBoardCategoryPrefix + categorySlug
}

// PredictCategoryBoardDef builds the API-facing definition for a single
// category. The display name is "<Category> Champions" per plan §2.
func PredictCategoryBoardDef(categorySlug, categoryName string) PredictBoardDef {
	return PredictBoardDef{
		ID:               PredictCategoryBoardID(categorySlug),
		Name:             categoryName + " Champions",
		Description:      "Top traders in " + categoryName + " this calendar week.",
		MetricLabel:      "P&L",
		Window:           PredictBoardWindowWeekly,
		MinSettled:       3,
		CategorySlug:     categorySlug,
		QualificationMsg: "Settle 3 " + categoryName + " markets this week to qualify.",
	}
}
