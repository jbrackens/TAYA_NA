package http

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestLaunchDocsStayPointsOnly(t *testing.T) {
	root := filepath.Clean("../../../..")
	files := []string{
		filepath.Join(root, "README.md"),
		filepath.Join(root, "services/gateway/Makefile"),
		filepath.Join(root, "services/gateway/api/openapi.yaml"),
	}
	unsafe := regexp.MustCompile(`(?i)\b(cashier|cashout|deposit|withdraw|withdrawal|crypto|fiat|redeem|redeemable|prize|payout|sportsbook|usdc|usd|dollars?)\b|\$`)
	unsafeMakefile := regexp.MustCompile(`(?i)\b(cashier|cashout|deposit|withdraw|withdrawal|crypto|fiat|redeem|redeemable|prize|payout|sportsbook|usdc|usd|dollars?)\b`)

	for _, file := range files {
		body, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}
		content := strings.NewReplacer(
			"non-redeemable", "",
			"$ref", "ref",
		).Replace(string(body))
		scanner := unsafe
		if filepath.Base(file) == "Makefile" {
			scanner = unsafeMakefile
		}
		matches := scanner.FindAllString(content, -1)
		if len(matches) > 0 {
			t.Fatalf("%s contains launch-prohibited docs copy: %s", file, strings.Join(matches, ", "))
		}
	}
}

func TestGatewayMakefileUsesLaunchSeedCommand(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/Makefile"))
	if err != nil {
		t.Fatalf("read gateway Makefile: %v", err)
	}
	content := string(body)
	required := []string{
		"seed: ## Load TapTrade launch base seed data",
		"go run ./cmd/seed -mode base",
		"demo-data: ## Load base seed + demo state",
		"go run ./cmd/seed -mode demo",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("gateway Makefile missing launch seed marker %q", needle)
		}
	}
	for _, retired := range []string{
		"psql $(GATEWAY_DB_DSN) -f migrations/seed.sql",
		"make seed              Load development seed data",
	} {
		if strings.Contains(content, retired) {
			t.Fatalf("gateway Makefile still contains retired seed marker %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsAdminLifecycleSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/admin/markets/{id}:",
		"/api/v1/admin/markets/{id}/lifecycle:",
		"/api/v1/admin/markets/{id}/lifecycle/{action}:",
		"/api/v1/admin/settlements/replay:",
		"AdminMarketUpdateRequest:",
		"MarketLifecycleResponse:",
		"SettlementReplayResponse:",
		"point disbursements",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing admin lifecycle launch doc marker %q", needle)
		}
	}
}

func TestLaunchOpenAPIDocumentsGatewayStatusBoundary(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/status:",
		"GatewayStatus:",
		"pointMode:",
		"enum: [non_redeemable_points]",
		"legacyMoneyRoutes:",
		"enum: [disabled, enabled]",
		"launchRouteDomains:",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing gateway status launch-boundary marker %q", needle)
		}
	}
}

func TestLaunchOpenAPIDocumentsRewardSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/wallet/daily-claim:",
		"/api/v1/wallet/point-packs:",
		"/api/v1/wallet/point-packs/claim:",
		"/api/v1/wallet/missions:",
		"/api/v1/wallet/missions/claim:",
		"/api/v1/wallet/streaks:",
		"/api/v1/wallet/streaks/claim:",
		"/api/v1/wallet/badges:",
		"/api/v1/wallet/reward-limits:",
		"RewardGrantResponse:",
		"RewardLimitStatus:",
		"Credits only the authenticated session user",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing reward launch doc marker %q", needle)
		}
	}
}

func TestLaunchOpenAPIDocumentsBonusCampaignSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/bonuses/active:",
		"/api/v1/bonuses/claim:",
		"/api/v1/bonuses/{id}:",
		"/api/v1/bonuses/{id}/progress:",
		"/api/v1/admin/campaigns:",
		"/api/v1/admin/campaigns/{id}:",
		"/api/v1/admin/campaigns/{id}/activate:",
		"/api/v1/admin/campaigns/{id}/pause:",
		"/api/v1/admin/campaigns/{id}/close:",
		"/api/v1/admin/bonuses:",
		"/api/v1/admin/bonuses/grant:",
		"/api/v1/admin/bonuses/{id}:",
		"/api/v1/admin/bonuses/{id}/forfeit:",
		"PlayerBonus:",
		"PlayerBonusProgress:",
		"AdminCampaign:",
		"AdminCampaignRule:",
		"AdminCampaignRuleInput:",
		"AdminCampaignCreateRequest:",
		"AdminBonusGrantRequest:",
		"AdminBonusForfeitResponse:",
		"enum: [eligibility, trigger, reward, play]",
		"enum: [signup_bonus, custom, point_grant, point_match]",
		"budgetPointsCents",
		"spentPointsCents",
		"budget_points_cents",
		"override_points_cents",
		"pointRuleConfig",
		"point_rule_config",
		"max_play_contribution_points_cents",
		"playRequiredPointsCents",
		"Returns only PTS unit fields and point-play progress aliases",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing bonus/campaign launch doc marker %q", needle)
		}
	}

	bonusSchema := openAPISection(content, "    PlayerBonus:", "    PlayerBonusListResponse:")
	progressSchema := openAPISection(content, "    PlayerBonusProgress:", "    AdminCampaign:")
	campaignSchema := openAPISection(content, "    AdminCampaign:", "    AdminCampaignListResponse:")
	ruleSchema := openAPISection(content, "    AdminCampaignRule:", "    AdminCampaignDetailResponse:")
	campaignCreateSchema := openAPISection(content, "    AdminCampaignCreateRequest:", "    AdminCampaignDetailResponse:")
	actionSchema := openAPISection(content, "    AdminCampaignActionResponse:", "    AdminBonusGrantRequest:")
	grantSchema := openAPISection(content, "    AdminBonusGrantRequest:", "    AdminBonusForfeitRequest:")
	forfeitSchema := openAPISection(content, "    AdminBonusForfeitResponse:", "    ResponsiblePlayLimitRequest:")

	for _, retired := range []string{"grantedAmountCents", "remainingAmountCents", "wageringRequiredCents", "wageringCompletedCents", "wageringProgressPct", "progressPct"} {
		if strings.Contains(bonusSchema, retired) {
			t.Fatalf("player bonus schema should not document retired alias %q", retired)
		}
		if strings.Contains(progressSchema, retired) {
			t.Fatalf("player bonus progress schema should not document retired alias %q", retired)
		}
	}
	for _, retired := range []string{"freebet_grant", "deposit_match"} {
		if strings.Contains(bonusSchema, retired) {
			t.Fatalf("player bonus schema should not document retired campaign type %q", retired)
		}
	}
	for _, retired := range []string{"budgetCents", "spentCents", "rules:"} {
		if strings.Contains(campaignSchema, retired) {
			t.Fatalf("admin campaign schema should not document retired alias %q", retired)
		}
	}
	for _, retired := range []string{"freebet_grant", "deposit_match"} {
		if strings.Contains(campaignSchema, retired) {
			t.Fatalf("admin campaign schema should not document retired campaign type %q", retired)
		}
		if strings.Contains(campaignCreateSchema, retired) {
			t.Fatalf("admin campaign create schema should not document retired campaign type %q", retired)
		}
	}
	for _, retired := range []string{"ruleConfig:", "enum: [eligibility, trigger, reward, wagering]", "max_bonus_cents", "fixed_amount_cents", "max_stake_contribution_cents", "max_stake_contribution_points_cents", "min_amount_cents"} {
		if strings.Contains(ruleSchema, retired) {
			t.Fatalf("admin campaign rule schema should not document retired alias %q", retired)
		}
	}
	for _, retired := range []string{"budget_cents", "        rule_config:", "enum: [eligibility, trigger, reward, wagering]", "max_bonus_cents", "fixed_amount_cents", "max_stake_contribution_cents", "max_stake_contribution_points_cents", "min_amount_cents"} {
		if strings.Contains(campaignCreateSchema, retired) {
			t.Fatalf("admin campaign create schema should not document retired request alias %q", retired)
		}
	}
	if strings.Contains(grantSchema, "override_amount_cents") {
		t.Fatalf("admin bonus grant schema should not document retired request alias override_amount_cents")
	}
	for _, required := range []string{"status:", "unit:", "enum: [PTS]"} {
		if !strings.Contains(actionSchema, required) {
			t.Fatalf("admin campaign action schema missing point-native field %q", required)
		}
	}
	for _, required := range []string{"status:", "unit:", "enum: [PTS]"} {
		if !strings.Contains(forfeitSchema, required) {
			t.Fatalf("admin bonus forfeit schema missing point-native field %q", required)
		}
	}
}

func TestLaunchOpenAPIDocumentsSocialSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/social/markets/{marketId}/comments:",
		"/api/v1/social/comments/{commentId}/react:",
		"/api/v1/social/comments/{commentId}/report:",
		"/api/v1/social/users/{userId}/profile:",
		"/api/v1/social/users/{userId}/follow:",
		"/api/v1/social/users/{userId}/activity:",
		"/api/v1/social/activity:",
		"/api/v1/admin/social/reports:",
		"/api/v1/admin/social/reports/{id}/resolve:",
		"/api/v1/admin/social/activity:",
		"SocialComment:",
		"SocialActivityItem:",
		"AdminSocialReport:",
		"formula-safe moderation export rows",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing social launch doc marker %q", needle)
		}
	}
}

func TestLaunchOpenAPIDocumentsRiskSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/admin/prediction/risk:",
		"PredictionRiskSnapshot:",
		"PredictionRiskSettlementAging:",
		"PredictionRiskMarketExposure:",
		"PredictionRiskPointAccounting:",
		"point-accounting invariants",
		"formula-safe point-accounting export rows",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing risk launch doc marker %q", needle)
		}
	}
}

func TestLaunchOpenAPIDocumentsAdminDashboardSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/admin/dashboard/volume:",
		"DashboardVolumeStats:",
		"DashboardMover:",
		"Read-only operator dashboard aggregate for recent point activity and top market movement, with point-native fields and no point movement",
		"totalVolumePointsCents",
		"yesPricePointsCentsStart",
		"yesPricePointsCentsNow",
		"volumePointsCents",
		"Dashboard point-activity aggregate with point-native fields and no point movement",
		"/api/v1/admin/prediction/drift-alerts:",
		"CollateralDriftAlert:",
		"Read-only reconciliation alert rows with point-native drift fields and no point movement",
		"maxDriftPointsCents",
		"totalDriftPointsCents",
		"unit: { type: string, enum: [PTS]",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing admin dashboard launch doc marker %q", needle)
		}
	}
	dashboardSchemas := content[strings.Index(content, "DashboardVolumeStats:"):strings.Index(content, "PredictLeaderboardBoard:")]
	for _, retired := range []string{"totalVolumeCents", "yesPriceCentsStart", "yesPriceCentsNow", "volumeCents"} {
		if strings.Contains(dashboardSchemas, retired) {
			t.Fatalf("openapi dashboard activity schema should not document retired alias %q", retired)
		}
	}
	driftSchema := content[strings.Index(content, "CollateralDriftAlert:"):strings.Index(content, "DashboardVolumeStats:")]
	for _, retired := range []string{"maxDriftCents", "totalDriftCents"} {
		if strings.Contains(driftSchema, retired) {
			t.Fatalf("openapi drift alert schema should not document retired alias %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsAdminReportsSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/admin/wallet/reconciliation:",
		"/api/v1/admin/promotions/usage:",
		"AdminWalletReconciliationReport:",
		"AdminPointCampaignUsageReport:",
		"Read-only point-accounting aggregate from wallet ledger rows with point-native fields and no point movement",
		"Honest point-campaign usage report placeholder with point-native fields and no point movement",
		"totalCreditPointsCents",
		"totalDebitPointsCents",
		"netMovementPointsCents",
		"pointRewardCampaigns",
		"usersWithPointRewards",
		"totalRewardPointsCents",
		"unit: { type: string, enum: [PTS]",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing admin report launch doc marker %q", needle)
		}
	}
	reconciliationSchema := content[strings.Index(content, "AdminWalletReconciliationReport:"):strings.Index(content, "AdminPointCampaignUsageReport:")]
	for _, retired := range []string{"totalCreditsCents", "totalDebitsCents", "netMovementCents"} {
		if strings.Contains(reconciliationSchema, retired) {
			t.Fatalf("admin wallet reconciliation schema should not document retired alias %q", retired)
		}
	}
	pointCampaignSchema := content[strings.Index(content, "AdminPointCampaignUsageReport:"):strings.Index(content, "SocialComment:")]
	for _, retired := range []string{"totalBets", "totalStakeCents", "betsWithFreebet", "betsWithOddsBoost"} {
		if strings.Contains(pointCampaignSchema, retired) {
			t.Fatalf("admin point-campaign schema should not document retired metric %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsPortfolioSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/portfolio:",
		"/api/v1/portfolio/summary:",
		"/api/v1/portfolio/history:",
		"PortfolioSummary:",
		"totalValuePointsCents",
		"portfolioValuePointsCents",
		"investedPointsCents",
		"unrealizedPointsCents",
		"realizedPointsCents",
		"PortfolioHistoryItem:",
		"Settled prediction-history row with point-native result fields",
		"settlementPointsCents",
		"items: { $ref: \"#/components/schemas/PortfolioHistoryItem\" }",
		"Returns the authenticated session user's portfolio summary with preferred point-native aliases and no point movement",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing portfolio launch doc marker %q", needle)
		}
	}
	summarySchema := content[strings.Index(content, "PortfolioSummary:"):strings.Index(content, "PortfolioHistoryItem:")]
	for _, retired := range []string{"totalValueCents", "unrealizedPnlCents", "realizedPnlCents"} {
		if strings.Contains(summarySchema, retired) {
			t.Fatalf("portfolio summary schema should not document %s", retired)
		}
	}
	positionSchema := content[strings.Index(content, "    Position:"):strings.Index(content, "    BotOrderResponse:")]
	for _, required := range []string{"avgPricePointsCents", "totalCostPointsCents", "realizedPointsCents"} {
		if !strings.Contains(positionSchema, required) {
			t.Fatalf("portfolio position schema missing %s", required)
		}
	}
	for _, retired := range []string{"avgPriceCents", "totalCostCents", "realizedPnlCents"} {
		if strings.Contains(positionSchema, retired) {
			t.Fatalf("portfolio position schema should not document %s", retired)
		}
	}
	historySchema := content[strings.Index(content, "PortfolioHistoryItem:"):strings.Index(content, "AdminPunterDetail:")]
	for _, required := range []string{"entryPricePointsCents", "exitPricePointsCents", "realizedPointsCents", "settlementPointsCents"} {
		if !strings.Contains(historySchema, required) {
			t.Fatalf("portfolio history schema missing %s", required)
		}
	}
	for _, retired := range []string{"entryPriceCents", "exitPriceCents", "pnlCents", "payoutCents"} {
		if strings.Contains(historySchema, retired) {
			t.Fatalf("portfolio history schema should not document %s", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsMarketPayloadSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	start := strings.Index(content, "    Market:")
	end := strings.Index(content, "    PricePoint:")
	if start < 0 || end < 0 || end <= start {
		t.Fatalf("openapi missing Market schema slice")
	}
	marketSchema := content[start:end]
	required := []string{
		"Market:",
		"yesPricePointsCents",
		"noPricePointsCents",
		"lastTradePricePointsCents",
		"volumePointsCents",
		"openInterestPointsCents",
		"liquidityPointsCents",
		"ammSubsidyPointsCents",
		"collateralPoolPointsCents",
		"settlementPoolPointsCents",
		"bestYesBidPointsCents",
		"bestNoAskPointsCents",
		"Gameplay point unit for preferred point-native fields",
	}
	for _, needle := range required {
		if !strings.Contains(marketSchema, needle) {
			t.Fatalf("openapi missing market payload launch doc marker %q", needle)
		}
	}
	for _, retired := range []string{
		"yesPriceCents",
		"noPriceCents",
		"lastTradePriceCents",
		"volumeCents",
		"openInterestCents",
		"liquidityCents",
		"ammSubsidyCents",
		"collateralPoolCents",
		"settledPayoutPoolPointsCents",
		"settledPayoutPoolCents",
		"bestYesBidCents",
		"bestYesAskCents",
		"bestNoBidCents",
		"bestNoAskCents",
	} {
		if strings.Contains(marketSchema, retired) {
			t.Fatalf("openapi Market schema should not document retired alias %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsTradingPreviewSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/orders/preview:",
		"OrderPreview:",
		"Non-mutating order preview",
		"preferred point-native aliases and no point movement",
		"pricePointsCents",
		"totalCostPointsCents",
		"feePointsCents",
		"maxResultPointsCents",
		"maxLossPointsCents",
		"newYesPricePointsCents",
		"newNoPricePointsCents",
		"averageFillPricePointsCents",
		"totalCostWithFeesPointsCents",
		"estimatedSlippagePointsCents",
		"unit: { type: string, enum: [PTS]",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing %q", needle)
		}
	}
	previewSchema := content[strings.Index(content, "    OrderPreview:"):strings.Index(content, "    Position:")]
	for _, retired := range []string{"priceCents", "totalCostCents", "feeCents", "maxProfitCents", "maxProfitPointsCents", "maxLossCents", "newYesPriceCents", "newNoPriceCents", "averageFillPriceCents", "totalCostWithFeesCents", "estimatedSlippageCents"} {
		if strings.Contains(previewSchema, retired) {
			t.Fatalf("order preview schema should not document retired response alias %s", retired)
		}
	}
	orderSchema := content[strings.Index(content, "    Order:"):strings.Index(content, "    OrderPreview:")]
	for _, retired := range []string{"totalCostCents", "filledCostCents", "averageFillPriceCents", "notionalCapCents", "walletReservationId"} {
		if strings.Contains(orderSchema, retired) {
			t.Fatalf("order schema should not document retired response alias %s", retired)
		}
	}
	requestSchema := content[strings.Index(content, "    PlaceOrderRequest:"):strings.Index(content, "    Order:")]
	for _, required := range []string{"pricePointsCents", "notionalCapPointsCents"} {
		if !strings.Contains(requestSchema, required) {
			t.Fatalf("place-order request schema missing %s", required)
		}
	}
	for _, retired := range []string{"priceCents", "notionalCapCents"} {
		if strings.Contains(requestSchema, retired) {
			t.Fatalf("place-order request schema should not document retired request alias %s", retired)
		}
	}
	for _, required := range []string{"pricePointsCents", "averageFillPricePointsCents"} {
		if !strings.Contains(orderSchema, required) {
			t.Fatalf("order schema should document point-native %s", required)
		}
	}
	if strings.Contains(orderSchema, "priceCents") {
		t.Fatal("order schema should not document retired response alias priceCents")
	}
}

func TestLaunchOpenAPIDocumentsTradeTapeSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/markets/{id}/trades:",
		"Trade:",
		"Immutable public trade-tape fill row",
		"Recent trade-tape fills with preferred point-native aliases",
		"pricePointsCents",
		"feePointsCents",
		"notionalPointsCents",
		"unit: { type: string, enum: [PTS]",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing trade-tape launch doc marker %q", needle)
		}
	}
	tradeSchema := content[strings.Index(content, "    Trade:"):strings.Index(content, "    BotAPIKey:")]
	for _, retired := range []string{"priceCents", "feeCents"} {
		if strings.Contains(tradeSchema, retired) {
			t.Fatalf("openapi Trade schema should not document retired alias %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsPriceHistorySlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	start := strings.Index(content, "    PricePoint:")
	if start < 0 {
		t.Fatal("openapi missing PricePoint schema")
	}
	end := strings.Index(content[start:], "    MarketPriceHistory:")
	if end < 0 {
		t.Fatal("openapi missing MarketPriceHistory schema after PricePoint")
	}
	pricePointSchema := content[start : start+end]
	required := []string{
		"/api/v1/markets/{id}/prices:",
		"MarketPriceHistory:",
		"PricePoint:",
		"Market price-history buckets with point-native fields and no point movement",
		"yesPricePointsCents",
		"volumePointsCents",
		"unit: { type: string, enum: [PTS]",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing price-history launch doc marker %q", needle)
		}
	}
	for _, retired := range []string{"yesPriceCents", "volumeCents"} {
		if strings.Contains(pricePointSchema, retired) {
			t.Fatalf("PricePoint schema should not document retired alias %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsOrderBookSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/markets/{id}/orderbook:",
		"OrderBook:",
		"OrderBookLevel:",
		"Order-book depth with point-native fields and no point movement",
		"pricePointsCents",
		"shares",
		"cumulativeShares",
		"notionalPointsCents",
		"totalNotionalPointsCents",
		"Gameplay point unit for point-native fields",
		"unit: { type: string, enum: [PTS]",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing order-book launch doc marker %q", needle)
		}
	}
	orderBookSchema := content[strings.Index(content, "OrderBookLevel:"):strings.Index(content, "OrderBookSide:")]
	for _, retired := range []string{"priceCents", "quantity", "total:"} {
		if strings.Contains(orderBookSchema, retired) {
			t.Fatalf("openapi OrderBookLevel schema should not document retired depth alias %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsLeaderboardSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/leaderboards:",
		"/api/v1/leaderboards/{id}/entries:",
		"/api/v1/me/leaderboards:",
		"/api/v1/admin/leaderboards:",
		"/api/v1/admin/leaderboards/{id}:",
		"/api/v1/admin/leaderboards/{id}/entries:",
		"/api/v1/admin/leaderboards/{id}/recompute:",
		"PredictLeaderboardBoard:",
		"PredictLeaderboardEntry:",
		"AdminLeaderboardBoard:",
		"AdminLeaderboardEntry:",
		"AdminLeaderboardEventRequest:",
		"AdminLeaderboardEvent:",
		"metricKey:",
		"pointMetricKey:",
		"minVolumePointsCents:",
		"rewardSummary:",
		"activitySourceType:",
		"activitySourceId:",
		"PTS unit and non-redeemable reward-summary copy",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing leaderboard launch doc marker %q", needle)
		}
	}
	leaderboardSchemas := openAPISection(content, "    PredictLeaderboardBoard:", "    Error:")
	for _, blocked := range []string{"sourceType:", "sourceId:", "currency:", "prizeSummary:", "metricLabel:", "qualificationMsg:", "minVolumeCents:"} {
		if strings.Contains(leaderboardSchemas, blocked) {
			t.Fatalf("leaderboard schemas should not document retired alias %q", blocked)
		}
	}
}

func TestLaunchOpenAPIDocumentsLoyaltyAndRewardClusterSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/loyalty:",
		"/api/v1/loyalty/standing:",
		"/api/v1/loyalty/ledger:",
		"/api/v1/loyalty/tiers:",
		"/api/v1/admin/loyalty/accounts:",
		"/api/v1/admin/loyalty/accounts/{playerId}:",
		"/api/v1/admin/loyalty/adjustments:",
		"/api/v1/admin/loyalty/config:",
		"/api/v1/admin/loyalty/rules:",
		"/api/v1/admin/loyalty/rules/{ruleId}:",
		"/api/v1/admin/loyalty/tiers/{tierCode}:",
		"/api/v1/admin/wallet/reward-clusters:",
		"LoyaltyStanding:",
		"LoyaltyTier:",
		"LoyaltyLedgerEntry:",
		"AdminLoyaltyAccount:",
		"AdminLoyaltyRule:",
		"AdminLoyaltyRuleRequest:",
		"predictionSourceType:",
		"minQualifiedPointsCents:",
		"eligiblePredictionTypes:",
		"AdminRewardClusterSummary:",
		"hashed device/IP signal summaries",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing loyalty/reward-cluster launch doc marker %q", needle)
		}
	}
	standingSchema := openAPISection(content, "    LoyaltyStanding:", "    LoyaltyLedgerEntry:")
	ledgerSchema := openAPISection(content, "    LoyaltyLedgerEntry:", "    LoyaltyTier:")
	tierSchema := openAPISection(content, "    LoyaltyTier:", "    AdminLoyaltyAccount:")
	adminAccountSchema := openAPISection(content, "    AdminLoyaltyAccount:", "    AdminLoyaltyLedgerEntry:")
	adminLedgerSchema := openAPISection(content, "    AdminLoyaltyLedgerEntry:", "    AdminLoyaltyAdjustmentRequest:")
	for _, blocked := range []string{"tier:", "tierName:", "nextTier:", "nextTierName:", "pointsToNextTier:"} {
		if strings.Contains(standingSchema, blocked) {
			t.Fatalf("loyalty standing schema should not document retired alias %q", blocked)
		}
	}
	for _, blocked := range []string{"tier:", "name:", "pointsThreshold:"} {
		if strings.Contains(tierSchema, blocked) {
			t.Fatalf("loyalty tier schema should not document retired alias %q", blocked)
		}
	}
	for _, blocked := range []string{"tierCode:", "tierName:", "currentTier:", "nextTier:", "pointsToNextTier:"} {
		if strings.Contains(adminAccountSchema, blocked) {
			t.Fatalf("admin loyalty account schema should not document retired alias %q", blocked)
		}
	}
	for _, required := range []string{"predictionSourceType:", "predictionSourceId:", "unit: { type: string, enum: [PTS]"} {
		if !strings.Contains(ledgerSchema, required) {
			t.Fatalf("loyalty ledger schema missing point-native marker %q", required)
		}
		if !strings.Contains(adminLedgerSchema, required) {
			t.Fatalf("admin loyalty ledger schema missing point-native marker %q", required)
		}
	}
	for _, blocked := range []string{"sourceType:", "sourceId:"} {
		if strings.Contains(ledgerSchema, blocked) {
			t.Fatalf("loyalty ledger schema should not document retired alias %q", blocked)
		}
		if strings.Contains(adminLedgerSchema, blocked) {
			t.Fatalf("admin loyalty ledger schema should not document retired alias %q", blocked)
		}
	}
	ruleSchema := openAPISection(content, "    AdminLoyaltyRule:", "    AdminLoyaltyRuleRequest:")
	ruleRequestSchema := openAPISection(content, "    AdminLoyaltyRuleRequest:", "    AdminRewardClusterSummary:")
	for _, blocked := range []string{"sourceType:", "minQualifiedStakeCents:", "eligibleSportIds:", "eligibleBetTypes:"} {
		if strings.Contains(ruleSchema, blocked) {
			t.Fatalf("admin loyalty rule schema should not document retired alias %q", blocked)
		}
		if strings.Contains(ruleRequestSchema, blocked) {
			t.Fatalf("admin loyalty rule request schema should not document retired alias %q", blocked)
		}
	}
}

func TestLaunchOpenAPIDocumentsResponsiblePlaySlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/compliance/rg/point-use-limit:",
		"/api/v1/compliance/rg/point-use-limits:",
		"/api/v1/compliance/rg/prediction-limit:",
		"/api/v1/compliance/rg/prediction-limits:",
		"/api/v1/compliance/rg/check-point-use:",
		"/api/v1/compliance/rg/check-prediction:",
		"/api/v1/compliance/rg/cool-off:",
		"/api/v1/compliance/rg/self-exclude:",
		"/api/v1/compliance/rg/restrictions:",
		"ResponsiblePlayLimitRequest:",
		"ResponsiblePlayCheckResponse:",
		"ResponsiblePlayRestrictions:",
		"point_use_limit_exceeded",
		"prediction_limit_exceeded",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing responsible-play launch doc marker %q", needle)
		}
	}
	checkSchema := openAPISection(content, "    ResponsiblePlayCheckResponse:", "    ResponsiblePlayRestrictions:")
	for _, retired := range []string{"stakePointsCents", "stakeCents"} {
		if strings.Contains(checkSchema, retired) {
			t.Fatalf("responsible-play check schema should not document retired stake alias %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsBotAPISlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/bot/orders:",
		"/api/v1/bot/positions:",
		"/api/v1/bot/keys:",
		"/api/v1/bot/keys/{id}:",
		"/api/v1/admin/partner-keys:",
		"BotOrderResponse:",
		"BotPositionsResponse:",
		"BotAPIKeyCreateRequest:",
		"BotAPIKeyCreateResponse:",
		"BotAPIKeyRevokeResponse:",
		"AdminPartnerKeyCreateRequest:",
		"AdminPartnerKeyListResponse:",
		"selfMatchAction",
		"market-buy notional caps before market lookup",
		"same point-reservation and fill path as session orders",
		"notionalCapPointsCents",
		"capturedPointsCents",
		"releasedPointsCents",
		"reservedPointsCents",
		"totalCostPointsCents",
		"realizedPointsCents",
		"prediction_limit_exceeded",
		"Bot API key rate limit exceeded",
		"Full keys are never returned after creation",
		"Revokes only keys owned by the authenticated session user",
		"Scopes: read, trade.",
		"Only read and trade scopes are accepted",
		"rejects wildcard scopes before persistence",
		"records an audit event",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing bot API launch doc marker %q", needle)
		}
	}
	botKeyScheme := openAPISection(content, "    BotApiKey:", "  schemas:")
	for _, retired := range []string{"Scopes: read, trade, admin", "enum: [read, trade, admin]"} {
		if strings.Contains(botKeyScheme, retired) {
			t.Fatalf("bot API key security scheme should not document retired scope contract %q", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsTaxonomySlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/categories:",
		"/api/v1/categories/{slug}:",
		"/api/v1/series:",
		"/api/v1/tags:",
		"/api/v1/admin/categories:",
		"/api/v1/admin/series:",
		"/api/v1/admin/tags:",
		"AdminCategory:",
		"AdminSeries:",
		"AdminTagListResponse:",
		"metadata-only controls with no point movement",
		"Prohibited taxonomy terms are rejected before persistence",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing taxonomy launch doc marker %q", needle)
		}
	}
}

func TestLaunchOpenAPIDocumentsAdminAccountReviewSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/admin/punters:",
		"/api/v1/admin/punters/{id}:",
		"/api/v1/admin/punters/{id}/settlements:",
		"/api/v1/admin/punters/{id}/wallet:",
		"/api/v1/admin/punters/{id}/status:",
		"/api/v1/admin/punters/{id}/notes:",
		"/api/v1/admin/audit-logs:",
		"AdminPunterListItem:",
		"AdminPunterDetail:",
		"AdminPointLedgerEntry:",
		"AdminAuditLog:",
		"point-account summary",
		"immutable point-ledger rows",
		"pointAccountBalanceCents",
		"realizedPointsCents",
		"settlementPointsCents",
		"amountPointsCents",
		"balancePointsCents",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing admin account-review launch doc marker %q", needle)
		}
	}
	listSchema := content[strings.Index(content, "AdminPunterListItem:"):strings.Index(content, "PortfolioSummary:")]
	detailSchema := content[strings.Index(content, "AdminPunterDetail:"):strings.Index(content, "AdminPunterSettlement:")]
	for _, retired := range []string{"walletBalanceCents", "realizedPnlCents"} {
		if strings.Contains(listSchema, retired) {
			t.Fatalf("admin account list schema should not document %s", retired)
		}
		if strings.Contains(detailSchema, retired) {
			t.Fatalf("admin account detail schema should not document %s", retired)
		}
	}
	settlementSchema := content[strings.Index(content, "AdminPunterSettlement:"):strings.Index(content, "AdminPointLedgerEntry:")]
	for _, required := range []string{"entryPricePointsCents", "exitPricePointsCents", "realizedPointsCents", "settlementPointsCents"} {
		if !strings.Contains(settlementSchema, required) {
			t.Fatalf("admin account settlement schema missing %s", required)
		}
	}
	for _, retired := range []string{"entryPriceCents", "exitPriceCents", "pnlCents", "payoutCents"} {
		if strings.Contains(settlementSchema, retired) {
			t.Fatalf("admin account settlement schema should not document %s", retired)
		}
	}
	ledgerSchema := content[strings.Index(content, "AdminPointLedgerEntry:"):strings.Index(content, "AdminPunterStatusUpdateRequest:")]
	for _, retired := range []string{"amountCents", "balanceCents"} {
		if strings.Contains(ledgerSchema, retired) {
			t.Fatalf("admin point-ledger schema should not document %s", retired)
		}
	}
}

func TestLaunchOpenAPIDocumentsAdminMarketOperationsSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/admin/markets:",
		"/api/v1/admin/events:",
		"/api/v1/admin/market-sources:",
		"/api/v1/admin/ai-budget:",
		"/api/v1/admin/ai-budget/reserve:",
		"AdminMarketCreateRequest:",
		"AdminEventCreateRequest:",
		"AdminMarketSourceCreateRequest:",
		"AdminAIBudgetStatus:",
		"formula-safe market export rows",
		"Creation records metadata only and does not move points",
		"AI drafting rate limits are shared across server instances",
		"ammSubsidyPointsCents",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing admin market-operations launch doc marker %q", needle)
		}
	}
	createMarketSchema := openAPISection(content, "AdminMarketCreateRequest:", "AdminArticleSource:")
	if strings.Contains(createMarketSchema, "ammSubsidyCents") {
		t.Fatal("admin market create schema should not document retired ammSubsidyCents")
	}
}

func TestLaunchOpenAPIDocumentsSettlementAndDisputeSlice(t *testing.T) {
	root := filepath.Clean("../../../..")
	body, err := os.ReadFile(filepath.Join(root, "services/gateway/api/openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi: %v", err)
	}
	content := string(body)
	required := []string{
		"/api/v1/admin/settlements/{marketId}:",
		"/api/v1/admin/markets/{id}/propose:",
		"/api/v1/admin/markets/{id}/finalize:",
		"/api/v1/disputes:",
		"/api/v1/admin/disputes:",
		"/api/v1/admin/disputes/{id}/resolve:",
		"/api/v1/admin/resolution-sources:",
		"AdminSettlementOperationResponse:",
		"AdminSettlementPointDisbursement:",
		"ResolutionProposal:",
		"DisputeCreateRequest:",
		"bondPointsCents",
		"ResolutionSourceHealth:",
		"returns locked points through settlement point disbursement flow",
		"Filing a dispute blocks finalization until admin review and does not move points",
	}
	for _, needle := range required {
		if !strings.Contains(content, needle) {
			t.Fatalf("openapi missing settlement/dispute launch doc marker %q", needle)
		}
	}
	settlementSchema := openAPISection(content, "AdminSettlementRecord:", "AdminSettlementPointDisbursement:")
	for _, retired := range []string{"totalPayoutCents", "payoutsTotal", "payoutsCompleted", "currency"} {
		if strings.Contains(settlementSchema, retired) {
			t.Fatalf("admin settlement record schema should not document %s", retired)
		}
	}
	disputeSchema := openAPISection(content, "Dispute:", "DisputeCreateRequest:")
	for _, retired := range []string{"bondCents"} {
		if strings.Contains(disputeSchema, retired) {
			t.Fatalf("dispute schema should not document %s", retired)
		}
	}
}

func openAPISection(content, startMarker, endMarker string) string {
	start := strings.Index(content, startMarker)
	if start < 0 {
		return ""
	}
	rest := content[start+len(startMarker):]
	end := strings.Index(rest, endMarker)
	if end < 0 {
		return rest
	}
	return rest[:end]
}
