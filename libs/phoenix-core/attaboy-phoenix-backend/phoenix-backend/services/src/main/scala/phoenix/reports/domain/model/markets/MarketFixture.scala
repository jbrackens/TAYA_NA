package phoenix.reports.domain.model.markets

import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.sports.SportEntity.FixtureId

private[reports] final case class FixtureMarket(fixture: Fixture, market: Market, selections: Seq[MarketSelection]) {
  def selectionNameById(selectionId: SelectionId): Option[String] =
    selections.find(_.selectionId == selectionId).map(_.selectionName)

  def getSelectionNameById(selectionId: SelectionId): Future[String] =
    selectionNameById(selectionId)
      .map(Future.successful)
      .getOrElse(Future.failed(SelectionDoesNotExist(market.marketId, selectionId)))
}
private[reports] final case class Fixture(fixtureId: FixtureId, name: String, startTime: OffsetDateTime)
private[reports] final case class Market(marketId: MarketId, name: String, fixtureId: FixtureId)
private[reports] final case class MarketSelection(selectionId: SelectionId, selectionName: String, marketId: MarketId)
private[reports] final case class SelectionDoesNotExist(marketId: MarketId, selectionId: SelectionId)
    extends RuntimeException(
      s"Selection [selectionId = $selectionId] does not exist for market [marketId = ${marketId.value}]")
