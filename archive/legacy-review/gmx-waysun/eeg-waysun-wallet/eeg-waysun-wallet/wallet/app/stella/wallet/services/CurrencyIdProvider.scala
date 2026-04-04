package stella.wallet.services

import stella.wallet.models.Ids.CurrencyId

trait CurrencyIdProvider {
  def generateId(): CurrencyId
}

object RandomUuidMessageIdProvider extends CurrencyIdProvider {
  override def generateId(): CurrencyId = CurrencyId.random()
}
