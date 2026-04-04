package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.ErrorCode
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.ErrorCode.{BetRejectedOddsChanged, BetRejectedRaceOff, EventDataNotReady, EventNotSupported, Unexpected}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.{RequestMetadata, ResponseMetadata}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.{ErrorDetails, FailureResp}

object BusinessErrorFactory {

  def notReadySubscribeError(reqMeta: RequestMetadata, cause: Seq[String]): FailureResp =
    FailureResp(ResponseMetadata.failure(reqMeta),
      ErrorDetails(EventDataNotReady, "Hold your horses!", "We are preparing the game."),
      cause)

  def notSupportedSubscribeError(reqMeta: RequestMetadata, cause: Seq[String]): FailureResp =
    FailureResp(ResponseMetadata.failure(reqMeta),
      ErrorDetails(EventNotSupported, "Sorry!", "RaceCard roulette is not available on this race."),
      cause)

  def unexpectedCalculateError(reqMeta: RequestMetadata, cause: Seq[String]): FailureResp =
    FailureResp(ResponseMetadata.failure(reqMeta),
      ErrorDetails(ErrorCode.Unexpected, "Your chips could not be recalculated.", "Please try again."),
      cause)

  def raceOffBettingError(reqMeta: RequestMetadata, cause: Seq[String]): FailureResp =
    FailureResp(ResponseMetadata.failure(reqMeta),
      ErrorDetails(BetRejectedRaceOff, "Your bet could not be placed.", "The race has already started."),
      cause)

  def oddsChangedBettingError(reqMeta: RequestMetadata, cause: Seq[String]): FailureResp =
    FailureResp(ResponseMetadata.failure(reqMeta),
      ErrorDetails(BetRejectedOddsChanged, "Your bet could not be placed.", "The odds of your selections has changed."),
      cause)

  def unexpectedBettingError(reqMeta: RequestMetadata, cause: Seq[String]): FailureResp =
    FailureResp(ResponseMetadata.failure(reqMeta),
      ErrorDetails(Unexpected, "Your bet could not be placed.", "Please try again."),
      cause)
}
