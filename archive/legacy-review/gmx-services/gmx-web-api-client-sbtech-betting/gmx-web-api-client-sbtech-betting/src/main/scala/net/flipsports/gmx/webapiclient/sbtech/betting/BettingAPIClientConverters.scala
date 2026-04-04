package net.flipsports.gmx.webapiclient.sbtech.betting

import net.flipsports.gmx.webapiclient.sbtech.betting.dto._
import play.api.libs.json.{ Format, Json }

object BettingAPIClientConverters {
  implicit lazy val placeBetsRequestConverter: Format[PlaceBetsRequest] = Json.format[PlaceBetsRequest]
  implicit lazy val betConverter: Format[Bet] = Json.format[Bet]
  implicit lazy val selectionConverter: Format[Selection] = Json.format[Selection]
  implicit lazy val selectionMappedConverter: Format[SelectionMapped] = Json.format[SelectionMapped]

  implicit lazy val placeBetsResponseConverter: Format[PlaceBetsResponse] = Json.format[PlaceBetsResponse]

  implicit lazy val declineReasonConverter: Format[DeclineReason] = Json.format[DeclineReason]
  implicit lazy val declinedBetConverter: Format[DeclinedBet] = Json.format[DeclinedBet]
  implicit lazy val placeBetsErrorDetailsConverter: Format[PlaceBetsErrorDetails] = Json.format[PlaceBetsErrorDetails]
  implicit lazy val placeBetsErrorConverter: Format[PlaceBetsError] = Json.format[PlaceBetsError]

}
