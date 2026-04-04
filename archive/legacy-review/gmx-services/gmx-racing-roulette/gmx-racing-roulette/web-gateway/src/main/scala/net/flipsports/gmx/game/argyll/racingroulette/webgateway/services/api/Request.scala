package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import net.flipsports.gmx.common.mdc.MDCCorrelationUUID
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.Participant

object Request {

  sealed abstract class BaseRequest extends MDCCorrelationUUID {
    val meta: RequestMetadata

    override def extractUUID: String = meta.extractUUID
  }

  case class SubscribeEventReq(meta: RequestMetadata) extends BaseRequest

  case class EventUpdateReq(meta: RequestMetadata) extends BaseRequest

  case class CalculateReturnReq(meta: RequestMetadata, placedChips: Seq[UserChip]) extends BaseRequest

  case class PlaceBetsReq(meta: RequestMetadata, userJWT: String, placedChips: Seq[UserChip]) extends BaseRequest

  case class UserChip(display: String, totalStake: Double, selectedParticipants: Seq[Participant]) {
    def describe(): String = {
      s"(display = $display)"
    }
  }

}
