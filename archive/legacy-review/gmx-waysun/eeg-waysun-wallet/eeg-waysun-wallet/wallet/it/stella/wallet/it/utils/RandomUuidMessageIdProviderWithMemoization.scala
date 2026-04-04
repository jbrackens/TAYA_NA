package stella.wallet.it.utils

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.services.CurrencyIdProvider

object RandomUuidMessageIdProviderWithMemoization extends CurrencyIdProvider {
  private var lastGeneratedValue: CurrencyId = _

  override def generateId(): CurrencyId = {
    val id = CurrencyId.random()
    lastGeneratedValue = id
    id
  }

  def getLastGeneratedValue(): CurrencyId = lastGeneratedValue

  generateId()
}
