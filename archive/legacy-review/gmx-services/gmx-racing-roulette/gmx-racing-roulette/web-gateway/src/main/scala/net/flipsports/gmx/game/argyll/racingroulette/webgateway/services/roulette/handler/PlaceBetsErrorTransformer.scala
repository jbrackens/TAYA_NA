package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.handler

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.FailureResp
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.BusinessErrorFactory.{oddsChangedBettingError, raceOffBettingError, unexpectedBettingError}
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.StatusCode.{InvalidSelection, OddsNotMatch, PurchaseNotAccepted}
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.{DeclineReasonName, PlaceBetsError, StatusCode}

trait PlaceBetsErrorTransformer {

  def handleBusinessError(reqMeta: RequestMetadata, error: PlaceBetsError): FailureResp = StatusCode.withNameOption(error.statusCode) match {
    case Some(InvalidSelection) => raceOffBettingError(reqMeta, Array(error.statusDescription))
    case Some(OddsNotMatch) => oddsChangedBettingError(reqMeta, Array(error.statusDescription))
    case Some(PurchaseNotAccepted) =>
      val reasons = error.response.map(_.bets.flatMap(_.declineReasons))
      val oddsDeclined = reasons.flatMap(_.find(reason => DeclineReasonName.withNameOption(reason.name).isDefined))

      if (oddsDeclined.isDefined)
        oddsChangedBettingError(reqMeta, Array(oddsDeclined.get.reason))
      else {
        val otherReason = reasons.flatMap(_.headOption)
        unexpectedBettingError(reqMeta, Array(otherReason.get.reason))
      }
    case _ => unexpectedBettingError(reqMeta, Array(error.statusDescription))
  }

}
