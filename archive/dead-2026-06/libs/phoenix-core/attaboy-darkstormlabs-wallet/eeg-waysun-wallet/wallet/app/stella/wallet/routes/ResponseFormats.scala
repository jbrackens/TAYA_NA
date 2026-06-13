package stella.wallet.routes

import java.util.UUID

import play.api.libs.json._
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat

import stella.common.http.Response
import stella.common.http.error.ErrorOutput

import stella.wallet.models.currency.Currency
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.wallet.WalletBalance
import stella.wallet.models.wallet.WalletBalanceInCurrency
import stella.wallet.routes.error.AdditionalPresentationErrorCode

object ResponseFormats {

  val errorOutputFormats = new ErrorOutput.Formats(AdditionalPresentationErrorCode.values.toSeq: _*)
  val errorOutputSchemas = new ErrorOutput.Schemas(AdditionalPresentationErrorCode.values.toSeq: _*)

  implicit lazy val currencyResponseFormat: RootJsonFormat[Response[Currency]] =
    Response.responseFormat[Currency]

  implicit lazy val currencySeqResponseFormat: RootJsonFormat[Response[Seq[Currency]]] =
    Response.responseFormat[Seq[Currency]]

  implicit lazy val walletBalanceResponseFormat: RootJsonFormat[Response[WalletBalance]] =
    Response.responseFormat[WalletBalance]

  implicit lazy val walletBalanceInCurrencyResponseFormat: RootJsonFormat[Response[WalletBalanceInCurrency]] =
    Response.responseFormat[WalletBalanceInCurrency]

  implicit lazy val transactionSeqResponseFormat: RootJsonFormat[Response[Seq[Transaction]]] =
    Response.responseFormat[Seq[Transaction]]

  implicit lazy val uuidPlayFormat: Format[UUID] = new Format[UUID] {
    override def reads(json: JsValue): JsResult[UUID] = json match {
      case JsString(value) =>
        try {
          val uuid = UUID.fromString(value)
          JsSuccess(uuid)
        } catch {
          case e: IllegalArgumentException => JsError(e.getMessage)
        }
      case _ => JsError(s"Got $json but UUID String was expected")
    }

    override def writes(o: UUID): JsValue = JsString(o.toString)
  }

  implicit lazy val stringPlayFormat: Format[String] = new Format[String] {
    override def reads(json: JsValue): JsResult[String] = json match {
      case JsString(value) => JsSuccess(value)
      case _               => JsError(s"Got $json but String was expected")
    }

    override def writes(str: String): JsValue = JsString(str)
  }
}
