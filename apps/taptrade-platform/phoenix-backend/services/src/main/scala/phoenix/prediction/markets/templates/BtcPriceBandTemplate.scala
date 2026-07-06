package phoenix.prediction.markets.templates

import java.time.Duration
import java.time.OffsetDateTime

import phoenix.prediction.BtcMarketFactoryConfig
import phoenix.prediction.common.MarketSpec
import phoenix.prediction.common.SettlementSpec

final case class BtcTemplateContext(referencePrice: BigDecimal, generatedAt: OffsetDateTime)

final case class GeneratedPredictionMarket(
    spec: MarketSpec,
    settlementSpec: SettlementSpec)

final class BtcPriceBandTemplate(config: BtcMarketFactoryConfig) {

  def generate(context: BtcTemplateContext): List[GeneratedPredictionMarket] = {
    val opensAt = context.generatedAt.plus(toJavaDuration(config.marketOpenAhead.toNanos))
    val closesAt = opensAt.plus(toJavaDuration(config.marketTradingWindow.toNanos))
    val resolvesAt = closesAt.plusSeconds(1)
    val dayStamp = closesAt.toLocalDate.toString

    config.thresholds.map { threshold =>
      val normalizedThreshold = normalizeThreshold(threshold)
      val marketKey = s"btc-usd-gt-$normalizedThreshold-$dayStamp"
      val spec = MarketSpec(
        marketKey = marketKey,
        marketType = "CRYPTO_PRICE_BINARY",
        settlementSourceKey = config.settlementSourceKey,
        opensAt = opensAt,
        closesAt = closesAt,
        resolvesAt = resolvesAt)
      val settlement = SettlementSpec(
        sourceKey = config.settlementSourceKey,
        fallbackSourceKey = config.fallbackSourceKey,
        cutoffAt = closesAt,
        resolutionRule = config.resolutionRule)
      GeneratedPredictionMarket(spec = spec, settlementSpec = settlement)
    }
  }

  private def normalizeThreshold(value: BigDecimal): String =
    value.bigDecimal.stripTrailingZeros().toPlainString.replace('.', '_')

  private def toJavaDuration(durationNanos: Long): Duration =
    Duration.ofNanos(durationNanos)
}
