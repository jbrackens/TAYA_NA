package phoenix

import java.io.IOException
import java.time.LocalDate
import java.time.format.DateTimeFormatter

import scala.collection.immutable.Seq
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.xml.Node
import scala.xml.NodeSeq

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.marshallers.xml.ScalaXmlSupport._
import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.HttpCharset
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.MediaTypes
import akka.http.scaladsl.model.Uri.Path
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.model.headers.Host
import akka.http.scaladsl.unmarshalling.Unmarshal
import org.slf4j.LoggerFactory

trait PxpClient {

  lazy val pxpConfig: PxpConfig = Config.instance.pxp

  private implicit val system: ActorSystem = ActorSystem()
  private implicit val ec: ExecutionContext = system.dispatcher

  private lazy val httpClient: HttpExt = Http()
  private val log = LoggerFactory.getLogger(getClass)

  def initiateDeposit(punterId: String, user: User, txId: String, amount: BigDecimal, currency: String): Future[Unit] =
    initiatePayment(
      PaymentFormats
        .initiateDepositRequest(pxpConfig.merchantId, pxpConfig.shopId, punterId, user, txId, amount, currency))

  def initiateWithdrawal(
      punterId: String,
      user: User,
      txId: String,
      amount: BigDecimal,
      currency: String): Future[Unit] =
    initiatePayment(
      PaymentFormats
        .initiateWithdrawalRequest(pxpConfig.merchantId, pxpConfig.shopId, punterId, user, txId, amount, currency))

  private def initiatePayment(requestBody: Node): Future[Unit] = {
    val requestUri =
      pxpConfig.apiUrl.withPath(Path("/PaymentRedirectionService/PaymentService.svc/pox/initiatePayment"))
    val headers = Seq(
      Authorization(BasicHttpCredentials(pxpConfig.apiCredentials.username, pxpConfig.apiCredentials.password)),
      Host(pxpConfig.apiUrl.authority.host.address(), pxpConfig.apiUrl.effectivePort))
    val xmlContentType = ContentType(MediaTypes.`application/xml`, HttpCharset.custom("utf-8"))

    val httpRequest = HttpRequest(
      uri = requestUri,
      method = HttpMethods.POST,
      entity = HttpEntity(requestBody.toString()).withContentType(xmlContentType),
      headers = headers)

    for {
      response <- httpClient.singleRequest(httpRequest)
      responseBody <- Unmarshal(response).to[NodeSeq]
      _ <-
        if (response.status.isSuccess()) {
          Future.successful(
            log.info(
              "Received successful PXP response [statusCode = {}, responseBody = {}]",
              response.status,
              responseBody))
        } else {
          log.warn(
            "Received unexpected PXP response [statusCode = {}, responseBody = {}]",
            response.status,
            responseBody)
          Future.failed(new IOException(s"Unexpected pxp response ${responseBody.toString()}"))
        }
    } yield ()
  }
}

object PaymentFormats {
  private object PaymentMethods {
    val VisaDeposit = 2
    val VisaWithdrawal = 12
  }

  private object TestCreditCard {
    val cardNumber = "4111111111111111"
    val holderName = "Test"
    val verificationCode = 111
    val expiryMonth = 6
    val expiryYear = 2028
  }

  def initiateDepositRequest(
      merchantId: String,
      shopId: String,
      punterId: String,
      user: User,
      txId: String,
      amount: BigDecimal,
      currency: String): Node =
    initiatePaymentRequest(merchantId, shopId, PaymentMethods.VisaDeposit, punterId, user, txId, amount, currency)

  def initiateWithdrawalRequest(
      merchantId: String,
      shopId: String,
      punterId: String,
      user: User,
      txId: String,
      amount: BigDecimal,
      currency: String): Node =
    initiatePaymentRequest(merchantId, shopId, PaymentMethods.VisaWithdrawal, punterId, user, txId, amount, currency)

  private def initiatePaymentRequest(
      merchantId: String,
      shopId: String,
      paymentMethod: Int,
      punterId: String,
      user: User,
      txId: String,
      amount: BigDecimal,
      currency: String): Node =
    <initiatePaymentRequest xmlns="http://www.cqrpayments.com/PaymentProcessing"
                            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <merchantID>{merchantId}</merchantID>
      <shopID>{shopId}</shopID>
      <merchantTransactionID>{txId}</merchantTransactionID>
      <paymentMethodID>{paymentMethod}</paymentMethodID>
      <amount currencyCode={currency}>{amount}</amount>
      <userID>{punterId}</userID>
      <userData>
        <username>{user.credentials.username}</username>
        <firstname>{user.name.firstName}</firstname>
        <lastname>{user.name.lastName}</lastname>
        <email>{user.email}</email>
        <address>
          <street>{user.address.addressLine}</street>
          <postalCode>{user.address.zipcode}</postalCode>
          <city>{user.address.city}</city>
          <state>{user.address.state}</state>
          <countryCode2>{user.address.country}</countryCode2>
          <telephoneNumber>{user.phoneNumber}</telephoneNumber>
        </address>
        <dateOfBirth>{formatDateOfBirth(user.dateOfBirth)}</dateOfBirth>
        <identificationNumber>xxxxx{user.ssn}</identificationNumber>
      </userData>
      <userIP>127.0.0.1</userIP>
      <userSessionID>{txId}</userSessionID>
      <creationTypeID>1</creationTypeID>
      <specificPaymentData>
        <data xsi:type="keyStringValuePair">
          <key>PaymentDescription</key>
          <value>Initiated from contract-tests</value>
        </data>
        <data xsi:type="keyStringValuePair">
          <key>PaymentDescriptionLanguageCode</key>
          <value>en</value>
        </data>
      </specificPaymentData>
      <paymentAccount>
        <specificPaymentAccountData>
          <data xsi:type="keyStringValuePair">
            <key>CardNumber</key>
            <value>{TestCreditCard.cardNumber}</value>
          </data>
          <data xsi:type="keyStringValuePair">
            <key>CardVerificationCode</key>
            <value>{TestCreditCard.verificationCode}</value>
          </data>
          <data xsi:type="keyStringValuePair">
            <key>HolderName</key>
            <value>{TestCreditCard.holderName}</value>
          </data>
          <data xsi:type="keyIntValuePair">
            <key>ExpiryMonth</key>
            <value>{TestCreditCard.expiryMonth}</value>
          </data>
          <data xsi:type="keyIntValuePair">
            <key>ExpiryYear</key>
            <value>{TestCreditCard.expiryYear}</value>
          </data>
        </specificPaymentAccountData>
      </paymentAccount>
    </initiatePaymentRequest>

  private def formatDateOfBirth(dateOfBirth: DateOfBirth): String =
    DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(
      LocalDate.of(dateOfBirth.year, dateOfBirth.month, dateOfBirth.day).atStartOfDay())
}
