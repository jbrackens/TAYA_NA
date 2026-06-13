package stella.wallet.models.wallet

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.LowerCamelcase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import play.api.libs.json.Format
import play.api.libs.json.JsResult
import play.api.libs.json.JsString
import play.api.libs.json.JsSuccess
import play.api.libs.json.Json
import play.api.libs.json.OFormat
import play.api.libs.json.{JsValue => PlayJsValue}
import spray.json.DefaultJsonProtocol._
import spray.json.JsValue
import spray.json.JsonFormat
import spray.json.RootJsonFormat
import sttp.tapir.Codec
import sttp.tapir.Codec.parsedString
import sttp.tapir.CodecFormat
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SString
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.CurrencyId._
import stella.wallet.models.utils.RequestVerificationUtils
import stella.wallet.models.utils.SchemaUtils

final case class WalletBalance(balanceValues: List[WalletBalanceInCurrency])

object WalletBalance {
  implicit lazy val walletBalanceFormat: RootJsonFormat[WalletBalance] = jsonFormat1(WalletBalance.apply)

  implicit lazy val walletBalanceSchema: Schema[WalletBalance] =
    Schema.derived[WalletBalance]
}

final case class WalletBalanceInCurrency(currencyId: CurrencyId, balanceValue: BigDecimal)

object WalletBalanceInCurrency {
  implicit lazy val walletBalanceInCurrencyFormat: RootJsonFormat[WalletBalanceInCurrency] = jsonFormat2(
    WalletBalanceInCurrency.apply)

  implicit lazy val walletBalanceInCurrencySchema: Schema[WalletBalanceInCurrency] =
    Schema.derived[WalletBalanceInCurrency].modify(_.balanceValue)(_.encodedExample("715.4"))
}

final case class TransferFundsRequest(
    transferType: FundsTransferType,
    externalTransactionId: String,
    title: String,
    currencyId: CurrencyId,
    amount: PositiveBigDecimal) {
  import TransferFundsRequest._

  RequestVerificationUtils.verifyNonBlankString(
    "externalTransactionId",
    externalTransactionId,
    maxExternalTransactionIdLength)
  RequestVerificationUtils.verifyNonBlankString("title", title, maxTitleLength)
}

object TransferFundsRequest {
  private val maxExternalTransactionIdLength = 128
  private val maxTitleLength = 128

  implicit lazy val transferFundsRequestFormat: RootJsonFormat[TransferFundsRequest] = jsonFormat5(
    TransferFundsRequest.apply)

  implicit lazy val transferFundsRequestSchema: Schema[TransferFundsRequest] =
    Schema
      .derived[TransferFundsRequest]
      .modify(_.externalTransactionId)(
        SchemaUtils
          .nonBlankStringDescription(maxExternalTransactionIdLength)(_)
          .encodedExample("INV/01/02/2022-pmnt01"))
      .modify(_.title)(
        SchemaUtils.nonBlankStringDescription(maxTitleLength)(_).encodedExample("Payment via credit card"))

  implicit lazy val transferFundsRequestPlayFormat: OFormat[TransferFundsRequest] = Json.format[TransferFundsRequest]
}

sealed trait FundsTransferType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum

object FundsTransferType extends Enum[FundsTransferType] with PlayJsonEnum[FundsTransferType] {
  def values: IndexedSeq[FundsTransferType] = findValues

  case object TopUpFunds extends FundsTransferType
  case object WithdrawFunds extends FundsTransferType

  implicit lazy val balanceOperationFormat: JsonFormat[FundsTransferType] = jsonEnumFormat
}

final case class PositiveBigDecimal(value: BigDecimal) {
  require(value > 0, "Expected positive number")
}

object PositiveBigDecimal {
  implicit lazy val positiveBigDecimalFormat: RootJsonFormat[PositiveBigDecimal] =
    new RootJsonFormat[PositiveBigDecimal] {
      override def read(json: JsValue): PositiveBigDecimal = PositiveBigDecimal(BigDecimalJsonFormat.read(json))

      override def write(obj: PositiveBigDecimal): JsValue = BigDecimalJsonFormat.write(obj.value)
    }

  implicit lazy val positiveBigDecimalCodec: Codec[String, PositiveBigDecimal, CodecFormat.TextPlain] =
    parsedString[PositiveBigDecimal](v => PositiveBigDecimal(BigDecimal(v)))

  implicit lazy val positiveBigDecimalSchema: Schema[PositiveBigDecimal] =
    Schema[PositiveBigDecimal](SString()).description("Positive number").encodedExample("42.17")

  implicit lazy val positiveBigDecimalPlayFormat: Format[PositiveBigDecimal] =
    new Format[PositiveBigDecimal] {
      override def writes(o: PositiveBigDecimal): PlayJsValue = JsString(o.value.toString())

      override def reads(json: PlayJsValue): JsResult[PositiveBigDecimal] = json match {
        case JsString(value) => JsSuccess(PositiveBigDecimal(BigDecimal(value)))
        case _               => throw new IllegalArgumentException(s"Expected positive number represented as String but got $json")
      }
    }
}
