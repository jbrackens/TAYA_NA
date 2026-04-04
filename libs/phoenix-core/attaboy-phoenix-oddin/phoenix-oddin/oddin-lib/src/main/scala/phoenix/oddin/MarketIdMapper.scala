package phoenix.oddin

import java.util.UUID

import scala.concurrent.Future

trait MarketIdMapper {
  def retrievePhoenixId(oddinMarketId: String): Future[UUID]
}
