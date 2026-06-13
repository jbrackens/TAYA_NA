package phoenix.oddin

import java.time.Instant
import java.util.UUID

import phoenix.oddin.MarketIdRepository.MarketIdMapping

import scala.concurrent.{ ExecutionContext, Future }

trait MarketIdRepository {
  def findAllMappings()(implicit ec: ExecutionContext): Future[Seq[MarketIdMapping]]
  def saveAndReturnMapping(oddinMarketId: String)(implicit ec: ExecutionContext): Future[MarketIdMapping]
}

object MarketIdRepository {
  final case class MarketIdMapping(phoenixMarketId: UUID, oddinMarketId: String, createdAt: Instant)
}
