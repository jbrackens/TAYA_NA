package phoenix.auditlog.infrastructure

import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec
import io.circe.syntax._

import phoenix.auditlog.domain._
import phoenix.core.JsonFormats._
import phoenix.punters.infrastructure.PunterJsonFormats.punterIdCodec

object AuditLogJsonFormats {

  implicit val accountCreationEntryCodec: Codec[AccountCreationEntry] = deriveCodec
  implicit val accountClosureEntryCodec: Codec[AccountClosureEntry] = deriveCodec
  implicit val predictionMarketLifecycleEntryCodec: Codec[PredictionMarketLifecycleEntry] = deriveCodec

  implicit val auditLogEntryCodec: Codec[AuditLogEntry] = new Codec[AuditLogEntry] {

    private val accountCreationCategoryConstant = "ACCOUNT_CREATION"
    private val categoryConstant = "category"

    private val accountCreationConstant = "accountCreation"
    private val accountClosureConstant = "accountClosure"
    private val predictionMarketLifecycleConstant = "predictionMarketLifecycle"
    private val typeConstant = "type"

    override def apply(entry: AuditLogEntry): Json =
      entry match {
        case e: AccountCreationEntry =>
          writeWithType(e.asJson, accountCreationConstant, accountCreationCategoryConstant)
        case e: AccountClosureEntry => writeWithType(e.asJson, accountClosureConstant, accountCreationCategoryConstant)
        case e: PredictionMarketLifecycleEntry =>
          writeWithType(e.asJson, predictionMarketLifecycleConstant)
      }

    private def writeWithType(json: Json, typeValue: String, categoryValue: String): Json =
      writeWithType(json, typeValue).mapObject(_.add(categoryConstant, Json.fromString(categoryValue)))

    private def writeWithType(json: Json, typeValue: String): Json =
      json.mapObject(_.add(typeConstant, Json.fromString(typeValue)))

    override def apply(c: HCursor): Decoder.Result[AuditLogEntry] =
      c.downField(typeConstant).as[String].flatMap(readFromType(_, c))

    private def readFromType(eventType: String, c: HCursor): Decoder.Result[AuditLogEntry] =
      eventType match {
        case `accountCreationConstant` => c.as[AccountCreationEntry]
        case `accountClosureConstant`  => c.as[AccountClosureEntry]
        case `predictionMarketLifecycleConstant` =>
          c.as[PredictionMarketLifecycleEntry]
        case _                         => c.fail(s"Unexpected `type` field '$eventType'")
      }
  }
}
