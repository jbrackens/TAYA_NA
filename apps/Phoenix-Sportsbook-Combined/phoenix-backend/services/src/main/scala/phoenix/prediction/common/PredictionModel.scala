package phoenix.prediction.common

import java.time.OffsetDateTime
import java.util.UUID

final case class PredictionMarketId(value: UUID) extends AnyVal
final case class PredictionOutcomeId(value: UUID) extends AnyVal
final case class PredictionOrderId(value: UUID) extends AnyVal
final case class BotAccountId(value: UUID) extends AnyVal

final case class MarketSpec(
    marketKey: String,
    marketType: String,
    settlementSourceKey: String,
    opensAt: OffsetDateTime,
    closesAt: OffsetDateTime,
    resolvesAt: OffsetDateTime)

final case class SettlementSpec(
    sourceKey: String,
    fallbackSourceKey: Option[String],
    cutoffAt: OffsetDateTime,
    resolutionRule: String)
