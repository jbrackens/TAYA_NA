package phoenix.prediction.unit

import java.time.OffsetDateTime
import java.time.ZoneOffset

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.prediction.common.StreamEnvelope

object PredictionReplayDeterminismSpec {
  final case class SyntheticTrade(
      sequenceNo: Long,
      marketId: String,
      buyerAccountId: String,
      sellerAccountId: String,
      quantity: BigDecimal,
      price: BigDecimal,
      executedAt: OffsetDateTime)

  final case class ReplayState(
      lastSequenceNo: Long,
      positions: Map[String, BigDecimal],
      checksums: Vector[String])
}

final class PredictionReplayDeterminismSpec extends AnyWordSpecLike with Matchers {
  import PredictionReplayDeterminismSpec.{ReplayState, SyntheticTrade}

  private object ReplayEngine {
    def replay(trades: Seq[SyntheticTrade]): ReplayState = {
      val ordered = trades.sortBy(_.sequenceNo)

      val initial = ReplayState(lastSequenceNo = 0L, positions = Map.empty, checksums = Vector.empty)
      ordered.foldLeft(initial) { (state, trade) =>
        val payloadCanonicalJson =
          s"""{"buyer":"${trade.buyerAccountId}","seller":"${trade.sellerAccountId}","qty":"${trade.quantity}","price":"${trade.price}","ts":"${trade.executedAt}"}"""
        val checksum = StreamEnvelope.checksumOf(
          eventType = "trade.executed",
          aggregateType = "prediction_market",
          aggregateId = trade.marketId,
          sequenceNo = trade.sequenceNo,
          payloadCanonicalJson = payloadCanonicalJson)

        val buyerPosition = state.positions.getOrElse(trade.buyerAccountId, BigDecimal(0)) + trade.quantity
        val sellerPosition = state.positions.getOrElse(trade.sellerAccountId, BigDecimal(0)) - trade.quantity

        state.copy(
          lastSequenceNo = trade.sequenceNo,
          positions = state.positions + (trade.buyerAccountId -> buyerPosition) + (trade.sellerAccountId -> sellerPosition),
          checksums = state.checksums :+ checksum)
      }
    }
  }

  "Replay engine" should {
    "produce deterministic state for one day of synthetic trades" in {
      val dayStart = OffsetDateTime.of(2026, 3, 1, 0, 0, 0, 0, ZoneOffset.UTC)
      val syntheticTrades = generateOneDaySyntheticTrades(dayStart)

      val replayA = ReplayEngine.replay(syntheticTrades)
      val replayB = ReplayEngine.replay(syntheticTrades.reverse)

      replayA shouldBe replayB
      replayA.lastSequenceNo shouldBe syntheticTrades.size.toLong
      replayA.checksums.size shouldBe syntheticTrades.size
      replayA.positions.values.foldLeft(BigDecimal(0))(_ + _) shouldBe BigDecimal(0)
    }
  }

  private def generateOneDaySyntheticTrades(dayStart: OffsetDateTime): Vector[SyntheticTrade] = {
    val tradesPerDay = 24 * 12 // one trade every 5 minutes
    (1 to tradesPerDay).map { index =>
      val buyer = s"bot-${(index % 7) + 1}"
      val seller = s"bot-${((index + 3) % 7) + 1}"
      val quantity = BigDecimal("0.01") + BigDecimal(index % 5) * BigDecimal("0.0025")
      val price = BigDecimal(90000 + (index % 40) * 250)
      SyntheticTrade(
        sequenceNo = index.toLong,
        marketId = "btc-usd-gt-100000-2026-03-01",
        buyerAccountId = buyer,
        sellerAccountId = seller,
        quantity = quantity,
        price = price,
        executedAt = dayStart.plusMinutes((index - 1) * 5L))
    }.toVector
  }
}
