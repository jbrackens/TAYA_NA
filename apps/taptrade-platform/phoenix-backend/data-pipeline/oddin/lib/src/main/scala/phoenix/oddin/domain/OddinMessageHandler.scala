package phoenix.oddin.domain

import phoenix.oddin.domain.OddinMessageHandler._

trait OddinMessageHandler {

  def onBetCancel(betCancel: BetCancel): Unit

  def onBetSettlement(betSettlement: BetSettlement): Unit

  def onBetStop(betStop: BetStop): Unit

  def onFixtureChange(fixtureChange: FixtureChange): Unit

  def onOddsChange(marketChange: OddsChange): Unit
}

object OddinMessageHandler {

  final case class BetCancel(value: String)
  final case class BetSettlement(value: String)
  final case class BetStop(value: String)
  final case class FixtureChange(value: String)
  final case class OddsChange(value: String)
}
