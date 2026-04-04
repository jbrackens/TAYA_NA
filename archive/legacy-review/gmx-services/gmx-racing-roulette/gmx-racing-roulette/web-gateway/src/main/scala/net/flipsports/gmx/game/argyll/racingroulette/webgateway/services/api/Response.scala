package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import java.time.ZonedDateTime

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.{FailureMetadata, ResponseMetadata, SuccessMetadata}

object Response {

  sealed abstract class BaseResponse {
    val meta: ResponseMetadata
  }

  // EVENT STATE
  case class EventStateResp(meta: SuccessMetadata, location: String, startTime: ZonedDateTime, status: EventStatus,
                            participants: Seq[Participant]) extends BaseResponse

  case class Participant(id: String, position: Int, displayOdds: String, trueOdds: Double, status: SelectionStatus) {
    def describe(): String = {
      s"(position = $position; id = $id)"
    }
  }

  // CALCULATE
  case class CalculateReturnResp(meta: SuccessMetadata, returns: Seq[CalculatedReturn]) extends BaseResponse

  case class CalculatedReturn(display: String, totalStake: Double, potentialReturn: Double, includedSelections: Seq[Int], valid: Boolean)

  // SUBMIT
  case class PlaceBetsResp(meta: SuccessMetadata, result: String) extends BaseResponse

  // FAILURE
  case class FailureResp(meta: FailureMetadata, error: ErrorDetails, cause: Seq[String]) extends BaseResponse

  case class ErrorDetails(code: ErrorCode, message: String, description: String)

}
