package phoenix.prediction.infrastructure.http

import java.time.OffsetDateTime

final case class PredictionCategoryView(
    key: String,
    label: String,
    description: String,
    accent: String)

final case class PredictionOutcomeView(
    outcomeId: String,
    label: String,
    priceCents: Int,
    change1d: BigDecimal)

final case class PredictionMarketView(
    marketId: String,
    slug: String,
    title: String,
    shortTitle: String,
    categoryKey: String,
    categoryLabel: String,
    status: String,
    featured: Boolean,
    live: Boolean,
    closesAt: String,
    resolvesAt: String,
    volumeUsd: BigDecimal,
    liquidityUsd: BigDecimal,
    participants: Int,
    summary: String,
    insight: String,
    rules: Seq[String],
    tags: Seq[String],
    resolutionSource: String,
    heroMetricLabel: String,
    heroMetricValue: String,
    probabilityPercent: Int,
    priceChangePercent: BigDecimal,
    outcomes: Seq[PredictionOutcomeView],
    relatedMarketIds: Seq[String])

final case class PredictionOverviewView(
    featuredMarkets: Seq[PredictionMarketView],
    liveMarkets: Seq[PredictionMarketView],
    trendingMarkets: Seq[PredictionMarketView],
    categories: Seq[PredictionCategoryView])

final case class PredictionMarketsResponse(
    totalCount: Int,
    markets: Seq[PredictionMarketView])

final case class PredictionMarketDetailResponse(
    market: PredictionMarketView,
    relatedMarkets: Seq[PredictionMarketView])

final case class PredictionTicketPreviewRequest(
    marketId: String,
    outcomeId: String,
    stakeUsd: BigDecimal)

final case class PredictionTicketPreviewResponse(
    marketId: String,
    outcomeId: String,
    priceCents: Int,
    stakeUsd: BigDecimal,
    shares: BigDecimal,
    maxPayoutUsd: BigDecimal,
    maxProfitUsd: BigDecimal)

final case class PredictionAdminCategorySummary(
    key: String,
    label: String,
    marketCount: Int,
    liveMarketCount: Int,
    openMarketCount: Int,
    resolvedMarketCount: Int)

final case class PredictionAdminSummaryResponse(
    totalMarkets: Int,
    liveMarkets: Int,
    featuredMarkets: Int,
    resolvedMarkets: Int,
    totalVolumeUsd: BigDecimal,
    totalLiquidityUsd: BigDecimal,
    totalOrders: Int,
    openOrders: Int,
    cancelledOrders: Int,
    categories: Seq[PredictionAdminCategorySummary],
    topMarkets: Seq[PredictionMarketView])

final case class PredictionLifecycleEventView(
    id: String,
    action: String,
    marketStatusBefore: String,
    marketStatusAfter: String,
    outcomeId: Option[String],
    outcomeLabel: Option[String],
    performedBy: String,
    reason: String,
    performedAt: String)

final case class PredictionLifecycleHistoryResponse(
    marketId: String,
    totalCount: Int,
    items: Seq[PredictionLifecycleEventView])

object PredictionCatalog {

  val categories: Seq[PredictionCategoryView] = Seq(
    PredictionCategoryView(
      key = "crypto",
      label = "Crypto",
      description = "Bitcoin, Solana, ETFs, and crypto catalysts.",
      accent = "#00d4aa"),
    PredictionCategoryView(
      key = "politics",
      label = "Politics",
      description = "Elections, legislation, and government risk.",
      accent = "#4f8cff"),
    PredictionCategoryView(
      key = "macro",
      label = "Macro",
      description = "Rates, inflation, and market-moving macro calls.",
      accent = "#ffb020"),
    PredictionCategoryView(
      key = "sports",
      label = "Sports",
      description = "Narrative-driven sports outcomes beyond sportsbook lines.",
      accent = "#7a5cff"),
    PredictionCategoryView(
      key = "culture",
      label = "Culture",
      description = "Entertainment, launches, and internet moments.",
      accent = "#ff5c7a"),
    PredictionCategoryView(
      key = "technology",
      label = "Technology",
      description = "AI launches, platform bets, and tech milestones.",
      accent = "#5cc8ff"))

  val markets: Seq[PredictionMarketView] = Seq(
    PredictionMarketView(
      marketId = "pm-btc-120k-2026",
      slug = "bitcoin-120k-before-2026-close",
      title = "Will Bitcoin trade above $120k before December 31, 2026?",
      shortTitle = "BTC above $120k in 2026",
      categoryKey = "crypto",
      categoryLabel = "Crypto",
      status = "live",
      featured = true,
      live = true,
      closesAt = "2026-12-31T23:00:00Z",
      resolvesAt = "2026-12-31T23:59:00Z",
      volumeUsd = BigDecimal(4825000),
      liquidityUsd = BigDecimal(965000),
      participants = 1842,
      summary = "A high-volume flagship crypto market tracking whether Bitcoin prints above the $120k threshold before year-end.",
      insight = "Momentum accelerated after ETF inflows returned and perpetual funding normalized.",
      rules = Seq(
        "Resolves YES if a reputable reference source prints BTC/USD above 120,000.00 before market close.",
        "If the threshold is never printed before the close timestamp, the market resolves NO."),
      tags = Seq("Featured", "Live", "Crypto"),
      resolutionSource = "Composite BTC/USD reference basket",
      heroMetricLabel = "Implied YES",
      heroMetricValue = "62%",
      probabilityPercent = 62,
      priceChangePercent = BigDecimal("8.4"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 62, BigDecimal("4.2")),
        PredictionOutcomeView("no", "No", 38, BigDecimal("-4.2"))),
      relatedMarketIds = Seq("pm-solana-etf-2026", "pm-fed-cut-july-2026")),
    PredictionMarketView(
      marketId = "pm-solana-etf-2026",
      slug = "solana-spot-etf-approved-before-2026-close",
      title = "Will a U.S. spot Solana ETF be approved before December 31, 2026?",
      shortTitle = "Spot SOL ETF in 2026",
      categoryKey = "crypto",
      categoryLabel = "Crypto",
      status = "open",
      featured = true,
      live = false,
      closesAt = "2026-12-31T23:00:00Z",
      resolvesAt = "2026-12-31T23:59:00Z",
      volumeUsd = BigDecimal(1395000),
      liquidityUsd = BigDecimal(355000),
      participants = 792,
      summary = "Tracks whether a U.S.-listed spot ETF for Solana receives formal approval before year-end.",
      insight = "The market tightened after new filing momentum and custody chatter improved the approval narrative.",
      rules = Seq(
        "Resolves YES on formal approval by the relevant U.S. regulator before market close.",
        "Withdrawn or indefinitely delayed filings resolve NO at expiry."),
      tags = Seq("Featured", "ETF", "Crypto"),
      resolutionSource = "SEC filing / issuer announcement",
      heroMetricLabel = "Approval odds",
      heroMetricValue = "54%",
      probabilityPercent = 54,
      priceChangePercent = BigDecimal("3.1"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 54, BigDecimal("1.5")),
        PredictionOutcomeView("no", "No", 46, BigDecimal("-1.5"))),
      relatedMarketIds = Seq("pm-btc-120k-2026")),
    PredictionMarketView(
      marketId = "pm-us-shutdown-q3-2026",
      slug = "us-government-shutdown-before-q3-2026-end",
      title = "Will the U.S. government enter a shutdown before September 30, 2026?",
      shortTitle = "U.S. shutdown before Q3 end",
      categoryKey = "politics",
      categoryLabel = "Politics",
      status = "live",
      featured = false,
      live = true,
      closesAt = "2026-09-30T23:00:00Z",
      resolvesAt = "2026-09-30T23:59:00Z",
      volumeUsd = BigDecimal(2130000),
      liquidityUsd = BigDecimal(442000),
      participants = 1114,
      summary = "A live policy-risk market following congressional budget negotiations and shutdown risk.",
      insight = "Spreads widened after the latest fiscal hawk bloc rejected the continuing resolution.",
      rules = Seq(
        "Resolves YES if a federal government shutdown begins before the close timestamp.",
        "Temporary funding extensions without shutdown resolve NO at expiry."),
      tags = Seq("Live", "Politics"),
      resolutionSource = "Official federal operations notices",
      heroMetricLabel = "Shutdown risk",
      heroMetricValue = "47%",
      probabilityPercent = 47,
      priceChangePercent = BigDecimal("5.8"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 47, BigDecimal("2.9")),
        PredictionOutcomeView("no", "No", 53, BigDecimal("-2.9"))),
      relatedMarketIds = Seq("pm-fed-cut-july-2026")),
    PredictionMarketView(
      marketId = "pm-fed-cut-july-2026",
      slug = "fed-cuts-rates-before-july-2026-meeting",
      title = "Will the Fed cut rates before the July 2026 meeting?",
      shortTitle = "Fed cut before July 2026",
      categoryKey = "macro",
      categoryLabel = "Macro",
      status = "open",
      featured = true,
      live = false,
      closesAt = "2026-07-28T18:00:00Z",
      resolvesAt = "2026-07-29T00:00:00Z",
      volumeUsd = BigDecimal(3280000),
      liquidityUsd = BigDecimal(610000),
      participants = 1368,
      summary = "A macro flagship market that prices the next pivot in Fed policy.",
      insight = "Softening payroll revisions tightened the curve and pulled YES into the lead.",
      rules = Seq(
        "Resolves YES if the target range is lowered before the July 2026 meeting concludes.",
        "A hold or hike resolves NO."),
      tags = Seq("Featured", "Macro"),
      resolutionSource = "FOMC statement",
      heroMetricLabel = "Cut probability",
      heroMetricValue = "58%",
      probabilityPercent = 58,
      priceChangePercent = BigDecimal("2.6"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 58, BigDecimal("1.3")),
        PredictionOutcomeView("no", "No", 42, BigDecimal("-1.3"))),
      relatedMarketIds = Seq("pm-btc-120k-2026", "pm-us-shutdown-q3-2026")),
    PredictionMarketView(
      marketId = "pm-lakers-playoffs-2026",
      slug = "lakers-make-playoffs-2026",
      title = "Will the Lakers make the 2026 NBA playoffs?",
      shortTitle = "Lakers make 2026 playoffs",
      categoryKey = "sports",
      categoryLabel = "Sports",
      status = "open",
      featured = false,
      live = false,
      closesAt = "2026-04-10T23:00:00Z",
      resolvesAt = "2026-04-18T23:00:00Z",
      volumeUsd = BigDecimal(945000),
      liquidityUsd = BigDecimal(210000),
      participants = 640,
      summary = "A narrative sports market for season-long team performance rather than a single game line.",
      insight = "The market moved after the latest trade-window rumour cycle and rest-management concerns.",
      rules = Seq(
        "Resolves YES if the team officially qualifies for the postseason bracket or play-in pathway that converts into a playoff berth.",
        "Failure to qualify resolves NO."),
      tags = Seq("Sports"),
      resolutionSource = "Official NBA standings",
      heroMetricLabel = "Playoff odds",
      heroMetricValue = "44%",
      probabilityPercent = 44,
      priceChangePercent = BigDecimal("-1.8"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 44, BigDecimal("-0.9")),
        PredictionOutcomeView("no", "No", 56, BigDecimal("0.9"))),
      relatedMarketIds = Seq("pm-jon-jones-return-2026")),
    PredictionMarketView(
      marketId = "pm-jon-jones-return-2026",
      slug = "jon-jones-fights-again-before-2026-close",
      title = "Will Jon Jones fight again before December 31, 2026?",
      shortTitle = "Jon Jones return in 2026",
      categoryKey = "sports",
      categoryLabel = "Sports",
      status = "open",
      featured = false,
      live = false,
      closesAt = "2026-12-31T23:00:00Z",
      resolvesAt = "2026-12-31T23:59:00Z",
      volumeUsd = BigDecimal(675000),
      liquidityUsd = BigDecimal(133000),
      participants = 412,
      summary = "A celebrity-combat prediction market tracking whether one of MMA's biggest names returns to the cage.",
      insight = "Odds firmed after training-camp footage and promoter hints circulated.",
      rules = Seq(
        "Resolves YES if Jon Jones completes a sanctioned professional MMA fight before market close.",
        "Announcements without an actual fight resolve NO."),
      tags = Seq("Sports", "UFC"),
      resolutionSource = "Official promotion result",
      heroMetricLabel = "Return odds",
      heroMetricValue = "36%",
      probabilityPercent = 36,
      priceChangePercent = BigDecimal("4.7"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 36, BigDecimal("2.4")),
        PredictionOutcomeView("no", "No", 64, BigDecimal("-2.4"))),
      relatedMarketIds = Seq("pm-lakers-playoffs-2026")),
    PredictionMarketView(
      marketId = "pm-gta6-delay-2026",
      slug = "gta-vi-delayed-into-2027",
      title = "Will GTA VI be delayed into 2027?",
      shortTitle = "GTA VI delayed into 2027",
      categoryKey = "culture",
      categoryLabel = "Culture",
      status = "live",
      featured = false,
      live = true,
      closesAt = "2026-11-30T23:00:00Z",
      resolvesAt = "2026-12-31T23:00:00Z",
      volumeUsd = BigDecimal(1120000),
      liquidityUsd = BigDecimal(248000),
      participants = 882,
      summary = "A high-attention entertainment market that trades on launch-date confidence versus delay risk.",
      insight = "Community sentiment flipped after supply-chain chatter and silence on final gameplay reveal timing.",
      rules = Seq(
        "Resolves YES if the title is officially delayed such that launch occurs in 2027 or later.",
        "If launch remains scheduled inside 2026, the market resolves NO."),
      tags = Seq("Live", "Culture"),
      resolutionSource = "Official publisher announcement",
      heroMetricLabel = "Delay odds",
      heroMetricValue = "41%",
      probabilityPercent = 41,
      priceChangePercent = BigDecimal("6.2"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 41, BigDecimal("3.1")),
        PredictionOutcomeView("no", "No", 59, BigDecimal("-3.1"))),
      relatedMarketIds = Seq("pm-openai-gpt6-2026")),
    PredictionMarketView(
      marketId = "pm-openai-gpt6-2026",
      slug = "gpt-6-public-release-before-2026-close",
      title = "Will GPT-6 launch publicly before December 31, 2026?",
      shortTitle = "GPT-6 launches in 2026",
      categoryKey = "technology",
      categoryLabel = "Technology",
      status = "open",
      featured = true,
      live = false,
      closesAt = "2026-12-31T23:00:00Z",
      resolvesAt = "2026-12-31T23:59:00Z",
      volumeUsd = BigDecimal(2675000),
      liquidityUsd = BigDecimal(512000),
      participants = 1290,
      summary = "A flagship AI milestone market built around public model-launch timing.",
      insight = "The market repriced higher after enterprise roadmap chatter and new inference capacity signals.",
      rules = Seq(
        "Resolves YES if a public release explicitly branded GPT-6 is announced before market close.",
        "Research previews or rumors alone do not resolve YES."),
      tags = Seq("Featured", "Technology"),
      resolutionSource = "Official product announcement",
      heroMetricLabel = "Launch odds",
      heroMetricValue = "49%",
      probabilityPercent = 49,
      priceChangePercent = BigDecimal("1.9"),
      outcomes = Seq(
        PredictionOutcomeView("yes", "Yes", 49, BigDecimal("0.9")),
        PredictionOutcomeView("no", "No", 51, BigDecimal("-0.9"))),
      relatedMarketIds = Seq("pm-gta6-delay-2026")))

  def overview: PredictionOverviewView =
    PredictionOverviewView(
      featuredMarkets = markets.filter(_.featured),
      liveMarkets = markets.filter(_.live),
      trendingMarkets = markets.sortBy(_.volumeUsd).reverse.take(4),
      categories = categories)

  def listMarkets(
      categoryKey: Option[String] = None,
      status: Option[String] = None,
      featured: Option[Boolean] = None,
      live: Option[Boolean] = None): Seq[PredictionMarketView] = {
    val normalizedCategory = categoryKey.map(_.trim.toLowerCase).filter(_.nonEmpty)
    val normalizedStatus = status.map(_.trim.toLowerCase).filter(_.nonEmpty)

    markets.filter { market =>
      val categoryMatches = normalizedCategory.forall(category => category == "all" || market.categoryKey == category)
      val statusMatches = normalizedStatus.forall(_ == market.status.toLowerCase)
      val featuredMatches = featured.forall(_ == market.featured)
      val liveMatches = live.forall(_ == market.live)
      categoryMatches && statusMatches && featuredMatches && liveMatches
    }
  }

  def findMarket(marketIdOrSlug: String): Option[PredictionMarketView] = {
    val target = marketIdOrSlug.trim
    if (target.isEmpty) None else markets.find(market => market.marketId == target || market.slug == target)
  }

  def marketDetail(marketIdOrSlug: String): Option[PredictionMarketDetailResponse] =
    findMarket(marketIdOrSlug).map { market =>
      PredictionMarketDetailResponse(
        market = market,
        relatedMarkets = markets.filter(candidate => market.relatedMarketIds.contains(candidate.marketId)))
    }

  def preview(request: PredictionTicketPreviewRequest): Either[String, PredictionTicketPreviewResponse] = {
    for {
      market <- findMarket(request.marketId).toRight("Prediction market not found")
      outcome <- market.outcomes.find(_.outcomeId == request.outcomeId).toRight("Prediction outcome not found")
      _ <- Either.cond(request.stakeUsd > 0, (), "Stake must be greater than zero")
    } yield {
      val priceUsd = BigDecimal(outcome.priceCents) / 100
      val shares = roundCurrency(request.stakeUsd / priceUsd)
      val maxPayoutUsd = roundCurrency(shares)
      val maxProfitUsd = roundCurrency(maxPayoutUsd - request.stakeUsd)

      PredictionTicketPreviewResponse(
        marketId = market.marketId,
        outcomeId = outcome.outcomeId,
        priceCents = outcome.priceCents,
        stakeUsd = roundCurrency(request.stakeUsd),
        shares = shares,
        maxPayoutUsd = maxPayoutUsd,
        maxProfitUsd = maxProfitUsd)
    }
  }

  def adminSummary: PredictionAdminSummaryResponse = {
    val categorySummaries = categories.map { category =>
      val categoryMarkets = markets.filter(_.categoryKey == category.key)
      PredictionAdminCategorySummary(
        key = category.key,
        label = category.label,
        marketCount = categoryMarkets.size,
        liveMarketCount = categoryMarkets.count(_.live),
        openMarketCount = categoryMarkets.count(_.status == "open"),
        resolvedMarketCount = categoryMarkets.count(_.status == "resolved"))
    }

    val orderSummary = PredictionOrderStore.summary

    PredictionAdminSummaryResponse(
      totalMarkets = markets.size,
      liveMarkets = markets.count(_.live),
      featuredMarkets = markets.count(_.featured),
      resolvedMarkets = markets.count(_.status == "resolved"),
      totalVolumeUsd = markets.map(_.volumeUsd).sum,
      totalLiquidityUsd = markets.map(_.liquidityUsd).sum,
      totalOrders = orderSummary.totalOrders,
      openOrders = orderSummary.openOrders,
      cancelledOrders = orderSummary.cancelledOrders,
      categories = categorySummaries,
      topMarkets = markets.sortBy(_.volumeUsd).reverse.take(5))
  }

  private def roundCurrency(value: BigDecimal): BigDecimal =
    value.setScale(2, BigDecimal.RoundingMode.HALF_UP)

  val lastUpdatedAt: OffsetDateTime = OffsetDateTime.parse(
    markets.map(_.closesAt).sorted.lastOption.getOrElse("2026-12-31T23:00:00Z"))
}
