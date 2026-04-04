package phoenix.reports.infrastructure

import scala.reflect.ClassTag

import io.circe._
import io.circe.generic.semiauto.deriveCodec
import io.circe.syntax._

import phoenix.bets.BetEntity.BetId
import phoenix.bets.CancellationReason
import phoenix.core.JsonFormats._
import phoenix.core.currency.JsonFormats._
import phoenix.core.odds.OddsJsonFormats.decimalOddsCodec
import phoenix.markets.infrastructure.MarketJsonFormats._
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.reports.domain.model.bets.BetData
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.BetEvent._
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.markets.SportDiscipline

object ReportingJsonFormats {

  private implicit val eventIdCodec: Codec[EventId] = deriveCodec
  private implicit val betIdCodec: Codec[BetId] = deriveCodec
  private implicit val betDataCodec: Codec[BetData] = deriveCodec
  private implicit val disciplineCodec: Codec[SportDiscipline] = enumCodec(SportDiscipline)
  private implicit val cancellationReasonCodec: Codec[CancellationReason] =
    Codec[String].bimapValidated(_.value, CancellationReason.apply)

  implicit val betEventCodec: Codec[BetEvent] = new Codec[BetEvent] {
    private val eventTypeField = "eventType"

    private implicit val betOpenedCodec: Codec[BetOpened] = deriveCodec
    private implicit val betSettledCodec: Codec[BetSettled] = deriveCodec
    private implicit val betCancelledCodec: Codec[BetCancelled] = deriveCodec
    private implicit val betVoidedCodec: Codec[BetVoided] = deriveCodec
    private implicit val betPushedCodec: Codec[BetPushed] = deriveCodec
    private implicit val betResettledCodec: Codec[BetResettled] = deriveCodec

    override def apply(be: BetEvent): Json = {
      val serialized = be match {
        case event: BetOpened    => event.asJson
        case event: BetSettled   => event.asJson
        case event: BetCancelled => event.asJson
        case event: BetPushed    => event.asJson
        case event: BetVoided    => event.asJson
        case event: BetResettled => event.asJson
      }
      serialized.mapObject(_.add(eventTypeField, Json.fromString(typeOf(be))))
    }

    override def apply(c: HCursor): Decoder.Result[BetEvent] =
      for {
        eventType <- c.downField(eventTypeField).as[String]
        result <-
          if (eventType == typeOf[BetOpened]) c.as[BetOpened]
          else if (eventType == typeOf[BetSettled]) c.as[BetSettled]
          else if (eventType == typeOf[BetCancelled]) c.as[BetCancelled]
          else if (eventType == typeOf[BetPushed]) c.as[BetPushed]
          else if (eventType == typeOf[BetVoided]) c.as[BetVoided]
          else if (eventType == typeOf[BetResettled]) c.as[BetResettled]
          else c.fail(s"Cannot match type '$eventType'")
      } yield result

    private def typeOf(event: BetEvent): String =
      event.getClass.getSimpleName

    private def typeOf[E <: BetEvent](implicit ct: ClassTag[E]): String =
      ct.runtimeClass.getSimpleName
  }
}
