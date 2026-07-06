package phoenix.payments.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.statusCode

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.http.core.TapirAuthDirectives
import phoenix.http.routes.EndpointInputs.baseUrl.phoenixAppBaseUrlInput
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.jwt.JwtAuthenticator
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.TransactionId
import phoenix.payments.infrastructure.http.PaymentsJsonFormats._
import phoenix.punters.PuntersBoundedContext

private[payments] object PaymentsTapirEndpoints extends TapirCodecEnumeratum {

  import PaymentsTapirCodecs._

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.core.currency.CurrencyTapirSchemas._
  import phoenix.punters.infrastructure.http.PunterTapirSchemas._
  import PaymentsTapirSchemas._

  final case class PaymentRequest(amount: PositiveAmount[DefaultCurrencyMoney])
  final case class ChequeWithdrawalResponse(transactionId: TransactionId)

  def deposit(punters: PuntersBoundedContext, auth: JwtAuthenticator)(implicit ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActiveAndNegativePunterEndpointJwt(punters)(auth, ec)
      .post
      .in("payments" / "deposit")
      .in(phoenixAppBaseUrlInput)
      .in(jsonBody[PaymentRequest])
      .out(jsonBody[PaymentSessionStarted])
      .out(statusCode(StatusCode.Ok))

  def withdrawal(punters: PuntersBoundedContext, auth: JwtAuthenticator)(implicit ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_EndpointJwt(punters)(auth, ec)
      .post
      .in("payments" / "withdrawal")
      .in(phoenixAppBaseUrlInput)
      .in(jsonBody[PaymentRequest])
      .out(jsonBody[PaymentSessionStarted])
      .out(statusCode(StatusCode.Ok))

  def getTransactionDetails(auth: JwtAuthenticator)(implicit ec: ExecutionContext) =
    TapirAuthDirectives
      .punterEndpoint(auth, ec)
      .get
      .in("payments" / "transactions" / path[TransactionId])
      .out(jsonBody[PaymentTransaction])

  def cashWithdrawal(punters: PuntersBoundedContext, auth: JwtAuthenticator)(implicit ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_EndpointJwt(punters)(auth, ec)
      .post
      .in("payments" / "cash-withdrawal")
      .in(jsonBody[PaymentRequest])
      .out(jsonBody[CashWithdrawalIdentifier])
      .out(statusCode(StatusCode.Ok))

  def chequeWithdrawal(punters: PuntersBoundedContext, auth: JwtAuthenticator)(implicit ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_EndpointJwt(punters)(auth, ec)
      .post
      .in("payments" / "cheque-withdrawal")
      .in(jsonBody[PaymentRequest])
      .out(jsonBody[ChequeWithdrawalResponse])
      .out(statusCode(StatusCode.Ok))

}

private object PaymentsTapirCodecs {
  implicit val transactionIdCodec: Codec[String, TransactionId, CodecFormat.TextPlain] =
    Codec.string.map(TransactionId(_))(_.value)
}

private object PaymentsTapirSchemas {
  implicit val transactionIdSchema: Schema[TransactionId] = Schema.string
}
