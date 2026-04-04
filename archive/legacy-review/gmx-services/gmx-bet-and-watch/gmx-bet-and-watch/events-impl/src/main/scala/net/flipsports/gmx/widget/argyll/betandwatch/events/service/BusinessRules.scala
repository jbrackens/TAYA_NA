package net.flipsports.gmx.widget.argyll.betandwatch.events.service

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType.WATCH_AND_BET
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception.{InvalidUserCountryException, NoQualifyingBetException}
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.ProviderEvent
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.{InBetSelection, UserDetails}

trait BusinessRules {

  private lazy val minStake: Double = getConfig.getDouble("app.business-rules.min-stake")
  private lazy val verifyBets: Boolean = getConfig.getBoolean("app.business-rules.verify-bets")

  @throws(classOf[InvalidUserCountryException])
  def verifyCountry(user: UserDetails, event: ProviderEvent): Boolean = {
    if (isNotAllowed(user.countyCode, event.allowedCountries)
      || isDenied(user.countyCode, event.deniedCountries)) {
      throw new InvalidUserCountryException(s"User '${user.id}' is registered in forbidden country '${user.countyCode}")
    }
    true
  }

  private def isNotAllowed(countyCode: String, allowedCountries: Seq[String]): Boolean =
    allowedCountries.nonEmpty && !allowedCountries.contains(countyCode)

  private def isDenied(countyCode: String, deniedCountries: Seq[String]): Boolean =
    deniedCountries.nonEmpty && deniedCountries.contains(countyCode)

  @throws(classOf[NoQualifyingBetException])
  def verifyBets(user: UserDetails, event: ProviderEvent, bets: Seq[InBetSelection]): Boolean = {
    if (betsNotRequired(event)
      || betsQualifying(bets)) {
      return true
    }

    throw new NoQualifyingBetException(s"User '${user.id}' didn't made a qualifying bet for event '${event.description}")
  }

  private def betsNotRequired(event: ProviderEvent): Boolean =
    (!verifyBets
      || WATCH_AND_BET.equals(event.streamingModel)
      || event.testData)

  def betsQualifying(bets: Seq[InBetSelection]): Boolean =
    bets.map(_.bet.stake).sum >= minStake

  protected def getConfig: Config
}
