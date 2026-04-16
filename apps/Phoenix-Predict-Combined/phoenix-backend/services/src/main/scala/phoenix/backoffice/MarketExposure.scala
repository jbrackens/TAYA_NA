package phoenix.backoffice

import phoenix.core.currency.MoneyAmount
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId

final case class MarketExposure(
    marketId: MarketId,
    selectionId: SelectionId,
    totalStaked: MoneyAmount,
    potentialLoss: MoneyAmount)
