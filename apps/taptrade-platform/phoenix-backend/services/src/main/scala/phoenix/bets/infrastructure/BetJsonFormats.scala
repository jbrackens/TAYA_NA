package phoenix.bets.infrastructure

import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.extras.Configuration
import io.circe.generic.extras.semiauto.deriveConfiguredCodec
import io.circe.generic.semiauto.deriveCodec

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.BetProtocol.BetsStatusRequest
import phoenix.bets.BetStateUpdate
import phoenix.bets.BetStateUpdate.TargetState
import phoenix.bets.BetsBoundedContext._
import phoenix.bets.CancellationReason
import phoenix.bets.Stake
import phoenix.bets.application.BetPlacementAttemptId
import phoenix.bets.infrastructure.http.CancelBetRequest
import phoenix.bets.infrastructure.http.PlaceBetFailure
import phoenix.bets.infrastructure.http.PlaceBetResponse
import phoenix.bets.infrastructure.http.PlaceBetResponse.FailureCode
import phoenix.bets.infrastructure.http.PlaceBetResponse.SuccessCode
import phoenix.bets.infrastructure.http.PlaceBetResponse.failure
import phoenix.bets.infrastructure.http.PlaceBetResponse.success
import phoenix.bets.infrastructure.http.PlaceBetSuccess
import phoenix.core.JsonFormats._
import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.JsonFormats.defaultCurrencyMoneyCodec
import phoenix.core.error.PresentationErrorCode
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.infrastructure.MarketJsonFormats._
import phoenix.markets.infrastructure.MarketJsonFormats.marketIdCodec
import phoenix.punters.infrastructure.PunterJsonFormats.punterIdCodec

object BetJsonFormats {
  implicit val configuration: Configuration = Configuration.default

  implicit val betIdCodec: Codec[BetId] = Codec[String].bimap(_.value, BetId.apply)

  implicit val stakeCodec: Codec[Stake] = Codec[DefaultCurrencyMoney].bimapValidated(_.value, Stake.apply)

  implicit val betRequestCodec: Codec[BetRequest] = {
    import phoenix.core.odds.OddsJsonFormats.decimalOddsCodec
    deriveCodec
  }
  implicit val betsStatusRequestCodec: Codec[BetsStatusRequest] = deriveCodec

  implicit val betDataCodec: Codec[BetData] = {
    import phoenix.core.odds.OddsJsonFormats.formattedOddsCodec
    deriveConfiguredCodec[BetData]
  }
  implicit val betTargetStateCodec: Codec[TargetState] = enumCodec(TargetState)
  implicit val betStateUpdateCodec: Codec[BetStateUpdate] = deriveCodec

  implicit val betStatusCodec: Codec[BetStatus] = enumCodec(BetStatus)
  implicit val betOutcomeCodec: Codec[BetOutcome] = enumCodec(BetOutcome)

  implicit val betTypeFormat: Codec[BetType] = enumCodec(BetType)

  implicit val betLegCodec: Codec[Leg] = {
    import phoenix.core.odds.OddsJsonFormats.formattedOddsCodec
    deriveConfiguredCodec[Leg].dropNullValues
  }
  implicit val betViewCodec: Codec[BetView] = {
    import phoenix.core.odds.OddsJsonFormats.formattedOddsCodec
    deriveConfiguredCodec[BetView].dropNullValues
  }

  implicit val cancellationReasonCodec: Codec[CancellationReason] =
    Codec[String].bimapValidated(_.value, CancellationReason.apply)
  implicit val cancelBetRequestCodec: Codec[CancelBetRequest] = deriveCodec

  implicit object PlaceBetResultCodec extends Codec[PlaceBetResponse] {
    private val MarketIdKey = "marketId"
    private val SelectionIdKey = "selectionId"
    private val ResultKey = "result"
    private val BetIdKey = "betId"
    private val ErrorCodeKey = "errorCode"

    override def apply(outcome: PlaceBetResponse): Json =
      outcome match {
        case PlaceBetSuccess(betPlacementAttemptId, responseCode) =>
          Json.obj(
            MarketIdKey -> Json.fromString(betPlacementAttemptId.marketId.value),
            SelectionIdKey -> Json.fromString(betPlacementAttemptId.selectionId),
            ResultKey -> Json.fromInt(responseCode),
            BetIdKey -> Json.fromString(betPlacementAttemptId.betId.value))
        case PlaceBetFailure(betPlacementAttemptId, responseCode, errorCode) =>
          Json.obj(
            MarketIdKey -> Json.fromString(betPlacementAttemptId.marketId.value),
            SelectionIdKey -> Json.fromString(betPlacementAttemptId.selectionId),
            ResultKey -> Json.fromInt(responseCode),
            BetIdKey -> Json.fromString(betPlacementAttemptId.betId.value),
            ErrorCodeKey -> Json.fromString(errorCode.value))
      }

    override def apply(c: HCursor): Decoder.Result[PlaceBetResponse] =
      for {
        marketId <- c.downField(MarketIdKey).as[MarketId]
        rawSelectionId <- c.downField(SelectionIdKey).as[String]
        code <- c.downField(ResultKey).as[BigDecimal]
        betId <- c.downField(BetIdKey).as[String]
        errorMessage <- c.downField(ErrorCodeKey).as[Option[String]]
        betPlacementAttemptId = BetPlacementAttemptId(BetId(betId), marketId, rawSelectionId)
        result <- (code, errorMessage) match {
          case (SuccessCode, None) => Right(success(betPlacementAttemptId))
          case (FailureCode, Some(PresentationErrorCode.UnableToOpenBet.`value`)) =>
            Right(failure(betPlacementAttemptId, PresentationErrorCode.UnableToOpenBet))
          case (FailureCode, Some(PresentationErrorCode.UnexpectedBetState.`value`)) =>
            Right(failure(betPlacementAttemptId, PresentationErrorCode.UnexpectedBetState))
          case (FailureCode, Some(err)) =>
            c.fail(s"Unexpected error message '$err' when converting to presentation error code")
          case _ =>
            c.fail(
              s"I don't know how to convert (${marketId.value}, $rawSelectionId, $code, $betId, $errorMessage) to a ${PlaceBetResponse.simpleObjectName}")
        }
      } yield result
  }
}
