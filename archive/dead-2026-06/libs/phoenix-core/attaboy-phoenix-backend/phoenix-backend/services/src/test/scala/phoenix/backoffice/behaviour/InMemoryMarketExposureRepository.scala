package phoenix.backoffice.behaviour

import scala.concurrent.Future

import phoenix.backoffice.MarketExposure
import phoenix.backoffice.MarketExposureRepository
import phoenix.core.currency.MoneyAmount
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId

final class InMemoryMarketExposureRepository(initialExposures: Set[MarketExposure] = Set.empty)
    extends MarketExposureRepository {
  private var _exposures = initialExposures
  def exposures(): Set[MarketExposure] = _exposures

  override def updateExposure(
      marketId: MarketId,
      selectionId: SelectionId,
      totalStakedDelta: MoneyAmount,
      potentialLossDelta: MoneyAmount): Future[Unit] =
    Future.successful {
      _exposures = findBackofficeMarketInMemory(marketId, selectionId) match {
        case Some(existing) =>
          _exposures - existing + MarketExposure(
            marketId,
            selectionId,
            totalStaked = existing.totalStaked + totalStakedDelta,
            potentialLoss = existing.potentialLoss + potentialLossDelta)
        case None =>
          _exposures + MarketExposure(
            marketId,
            selectionId,
            totalStaked = totalStakedDelta,
            potentialLoss = potentialLossDelta)
      }
    }

  override def findExposure(marketId: MarketId, selectionId: SelectionId): Future[Option[MarketExposure]] =
    Future.successful(findBackofficeMarketInMemory(marketId, selectionId))

  private def findBackofficeMarketInMemory(marketId: MarketId, selectionId: SelectionId): Option[MarketExposure] =
    exposures().find(exposure => exposure.marketId == marketId && exposure.selectionId == selectionId)
}
