package phoenix

import scala.concurrent.Future
import scala.util.Random

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

import phoenix.Constants.Markets._
import phoenix.WebSocketProtocol.OutgoingWebsocketMessage
import phoenix.core.pagination.PaginatedResult

trait MarketRequests extends MarketFormats with HttpSupport {
  private lazy val publicApiUrl = Config.instance.phoenix.publicApiUrl

  def allAvailableFixtures(limit: Int = 5000): Future[PaginatedResult[Fixture]] = {
    log.info("Requesting list of available markets...")

    getCodec[PaginatedResult[Fixture]](s"$publicApiUrl/fixtures?pagination.itemsPerPage=$limit")
  }

  def allBettableMarkets(): Future[List[Market]] =
    allAvailableFixtures().map { result =>
      result
        .flatMap(_.markets)
        .data
        .filter(m => m.marketStatus.`type` == Bettable && m.selectionOdds.exists(_.displayOdds.nonEmpty))
        .toList
    }

  def randomBettableMarket(): Future[Market] =
    allBettableMarkets().map(Random.shuffle(_).head)

  def getFixture(sportId: String, fixtureId: String): Future[FixtureDetails] = {
    log.info(s"Requesting details for sportId='$sportId', fixtureId='$fixtureId'...")

    getCodec[FixtureDetails](s"$publicApiUrl/sports/$sportId/fixtures/$fixtureId")
  }

  def subscribeToMarketUpdates(correlationId: String, channel: String): OutgoingWebsocketMessage = {
    log.info(s"Subscribing to Web Socket market updates channel '$channel'...")
    OutgoingWebsocketMessage(correlationId, event = "subscribe", channel, token = None)
  }

}

trait MarketFormats {
  case class Sport(sportId: String)
  case class Fixture(sport: Sport, fixtureId: String, markets: Seq[Market])
  case class FixtureDetails(markets: Map[String, List[Market]])
  case class MarketStatus(`type`: String)
  case class Market(marketId: String, marketStatus: MarketStatus, selectionOdds: Seq[SelectionOdds])
  case class Odds(decimal: BigDecimal)
  case class SelectionOdds(displayOdds: Option[Odds], selectionId: String, selectionName: String)

  implicit val oddsFormat: Codec[Odds] = deriveCodec
  implicit val selectionOddsFormat: Codec[SelectionOdds] = deriveCodec
  implicit val marketStatusCodec: Codec[MarketStatus] = deriveCodec
  implicit val marketCodec: Codec[Market] = deriveCodec
  implicit val sportCodec: Codec[Sport] = deriveCodec
  implicit val fixtureDetailsFormat: Codec[FixtureDetails] = deriveCodec
  implicit val fixtureCodec: Codec[Fixture] = deriveCodec
}
