package phoenix.payments.infrastructure

import scala.annotation.nowarn
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.xml.NodeSeq

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.client.RequestBuilding.Post
import akka.http.scaladsl.marshallers.xml.ScalaXmlSupport._
import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.unmarshalling.Unmarshal
import cats.data.EitherT
import cats.syntax.applicativeError._
import cats.syntax.bifunctor._
import org.slf4j.LoggerFactory

import phoenix.core.XmlUtils._
import phoenix.http.core.HttpClient
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.PaymentsService._
import phoenix.payments.infrastructure.PaymentsXmlFormats._
import phoenix.payments.infrastructure.PxpPaymentsService.CreateCashWithdrawalHTTPRequest
import phoenix.payments.infrastructure.PxpPaymentsService.CreateCashWithdrawalHTTPResponse
import phoenix.payments.infrastructure.PxpPaymentsService.ExecutePaymentActionHTTPRequest
import phoenix.payments.infrastructure.PxpPaymentsService.ExecutePaymentActionHTTPResponse
import phoenix.payments.infrastructure.PxpPaymentsService.GetRedirectToPaymentScreenHTTPRequest
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.UserDetails

private[payments] final class PxpPaymentsService(httpClient: HttpClient, config: PaymentsConfig)(implicit
    system: ActorSystem[_])
    extends PaymentsService {

  private implicit val ec: ExecutionContext = system.executionContext
  private val log = LoggerFactory.getLogger(getClass)

  private val requestHeaders = Seq(Authorization(BasicHttpCredentials(config.username.value, config.password.value)))
  private val pxpBaseUrl = config.baseUrl.value

  override def startPayment(
      origin: PaymentOrigin,
      transaction: PaymentTransaction,
      details: UserDetails): EitherT[Future, PaymentServiceError, PaymentSessionStarted] =
    makePxpServiceCall(
      endpointPath = "/PaymentRedirectionService/PaymentRedirectionService.svc/pox/getRedirectData",
      GetRedirectToPaymentScreenHTTPRequest(config.merchantId, config.shopId, origin, transaction, details))

  override def confirmPayment(paymentId: PaymentId): EitherT[Future, PaymentServiceError, Unit] =
    executePaymentAction(ExecutePaymentActionHTTPRequest.capture(config.merchantId, config.shopId, paymentId))

  override def cancelPayment(paymentId: PaymentId, reason: String): EitherT[Future, PaymentServiceError, Unit] =
    executePaymentAction(ExecutePaymentActionHTTPRequest.cancel(config.merchantId, config.shopId, paymentId, reason))

  override def createCashWithdrawal(
      transaction: PaymentTransaction,
      userDetails: UserDetails,
      sessionId: PuntersBoundedContext.SessionId): EitherT[Future, PaymentServiceError, Unit] = {
    val request =
      CreateCashWithdrawalHTTPRequest(config.merchantId, config.shopId, transaction, userDetails, sessionId)
    makePxpServiceCall[CreateCashWithdrawalHTTPRequest, CreateCashWithdrawalHTTPResponse.type](
      endpointPath = "/PaymentRedirectionService/PaymentService.svc/pox/initiatepayment",
      request).map(_ => ())
  }

  private def executePaymentAction(
      request: ExecutePaymentActionHTTPRequest): EitherT[Future, PaymentServiceError, Unit] =
    makePxpServiceCall[ExecutePaymentActionHTTPRequest, ExecutePaymentActionHTTPResponse](
      endpointPath = "/PaymentRedirectionService/PaymentService.svc/pox/executePaymentAction",
      request).subflatMap(
      response =>
        Either.cond(
          response.statusCode == 0,
          (),
          PaymentServiceError(s"Unexpected PXP response [code = '${response.statusCode}']")))

  // For the sake of binary compat, HttpResponse is NOT a case class, which causes exhaustiveness check to fail
  @nowarn("cat=other-match-analysis")
  private def makePxpServiceCall[REQ: XmlWriter, RES: XmlNodeReader](
      endpointPath: String,
      body: REQ): EitherT[Future, PaymentServiceError, RES] = {
    val url = pxpBaseUrl + endpointPath
    val xmlBody = XmlWriter[REQ].write(body)
    val httpRequest = Post(url, content = xmlBody).withHeaders(requestHeaders)

    log.info(s"Calling PXP service url [$endpointPath] with payload [$xmlBody]")

    attemptSend(httpRequest)
      .flatMap {
        case HttpResponse(StatusCodes.OK, _, entity, _) =>
          readAsXml[RES](entity)

        case HttpResponse(statusCode, _, entity, _) =>
          readUnexpected[RES](statusCode, entity)
      }
      .leftMap { cause =>
        log.warn("PXP call failed", cause)
        cause
      }
  }

  private def attemptSend(request: HttpRequest): EitherT[Future, PaymentServiceError, HttpResponse] =
    httpClient
      .sendRequest(request)
      .attemptT
      .leftMap(cause => PaymentServiceError(s"Failed to execute PXP method call", cause))

  private def readAsXml[T: XmlNodeReader](entity: ResponseEntity): EitherT[Future, PaymentServiceError, T] =
    Unmarshal(entity)
      .to[NodeSeq]
      .attemptT
      .leftMap(cause => PaymentServiceError("Failed to parse PXP response as XML", cause))
      .subflatMap { xmlResponse =>
        log.info(s"Received PXP XML: {}", xmlResponse)
        xmlResponse
          .convertHead[T]
          .toEither
          .leftMap(cause => PaymentServiceError(s"Failed to parse PXP XML due to ['$cause']"))
      }

  private def readUnexpected[T](code: StatusCode, entity: ResponseEntity): EitherT[Future, PaymentServiceError, T] =
    Unmarshal(entity)
      .to[String]
      .attemptT
      .leftMap(cause => PaymentServiceError("Failed to parse unexpected PXP response as plain text", cause))
      .flatMap(plainText =>
        EitherT.leftT(PaymentServiceError(s"Unexpected PXP response [statusCode = '$code', response = '$plainText']")))
}

private[infrastructure] object PxpPaymentsService {
  final case class GetRedirectToPaymentScreenHTTPRequest(
      merchantId: MerchantId,
      shopId: ShopId,
      origin: PaymentOrigin,
      transaction: PaymentTransaction,
      userDetails: UserDetails)

  final case class GetRedirectDataHTTPResponse(redirectData: PaymentSessionStarted)

  final case class ExecutePaymentActionHTTPRequest(
      merchantId: MerchantId,
      shopId: ShopId,
      paymentId: PaymentId,
      action: Int,
      remark: String)
  object ExecutePaymentActionHTTPRequest {
    private val CAPTURE_ACTION = 205
    private val CANCEL_ACTION = 1

    def capture(merchantId: MerchantId, shopId: ShopId, paymentId: PaymentId): ExecutePaymentActionHTTPRequest =
      ExecutePaymentActionHTTPRequest(
        merchantId,
        shopId,
        paymentId,
        action = CAPTURE_ACTION,
        remark = "Transaction captured")

    def cancel(
        merchantId: MerchantId,
        shopId: ShopId,
        paymentId: PaymentId,
        cause: String): ExecutePaymentActionHTTPRequest =
      ExecutePaymentActionHTTPRequest(
        merchantId,
        shopId,
        paymentId,
        action = CANCEL_ACTION,
        remark = s"Transaction cancelled due to: $cause")
  }

  final case class ExecutePaymentActionHTTPResponse(statusCode: Int)

  final case class CreateCashWithdrawalHTTPRequest(
      merchantId: MerchantId,
      shopId: ShopId,
      transaction: PaymentTransaction,
      userDetails: UserDetails,
      sessionId: SessionId)

  case object CreateCashWithdrawalHTTPResponse
}
