package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette

import java.time.ZonedDateTime

import net.flipsports.gmx.common.json.CommonTypeConverters
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import play.api.libs.json.{Format, Json}

object MessageConverters {

  implicit val dateTimeFormat: Format[ZonedDateTime] = CommonTypeConverters.DefaultZonedDateTimeFormat

  implicit lazy val requestMetadataConverter: Format[RequestMetadata] = Json.format[RequestMetadata]
  implicit lazy val successMetadataConverter: Format[SuccessMetadata] = Json.format[SuccessMetadata]
  implicit lazy val failureMetadataConverter: Format[FailureMetadata] = Json.format[FailureMetadata]
  implicit lazy val subscribeEventReqConverter: Format[SubscribeEventReq] = Json.format[SubscribeEventReq]
  implicit lazy val eventUpdateReqConverter: Format[EventUpdateReq] = Json.format[EventUpdateReq]
  implicit lazy val eventStateRespRespConverter: Format[EventStateResp] = Json.format[EventStateResp]
  implicit lazy val participantConverter: Format[Participant] = Json.format[Participant]
  implicit lazy val calculateReturnReqConverter: Format[CalculateReturnReq] = Json.format[CalculateReturnReq]
  implicit lazy val userChipConverter: Format[UserChip] = Json.format[UserChip]
  implicit lazy val calculatedReturnConverter: Format[CalculatedReturn] = Json.format[CalculatedReturn]
  implicit lazy val placeBetsReqConverter: Format[PlaceBetsReq] = Json.format[PlaceBetsReq]
  implicit lazy val calculateReturnRespConverter: Format[CalculateReturnResp] = Json.format[CalculateReturnResp]
  implicit lazy val placeBetsRespConverter: Format[PlaceBetsResp] = Json.format[PlaceBetsResp]
  implicit lazy val errorDetailsConverter: Format[ErrorDetails] = Json.format[ErrorDetails]
  implicit lazy val failureRespConverter: Format[FailureResp] = Json.format[FailureResp]
}
