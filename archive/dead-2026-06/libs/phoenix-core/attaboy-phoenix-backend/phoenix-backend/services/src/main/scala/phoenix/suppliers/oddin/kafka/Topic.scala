package phoenix.suppliers.oddin.kafka

import phoenix.dataapi.internal.oddin.MarketChangedEvent

sealed trait Topic[T] {
  def name: String
}
object Topic {
  object OddinMarketOddsChangeEvents extends Topic[MarketChangedEvent] {
    val name: String = "phoenix-intake.oddin-market-odds"
  }
}
