package phoenix.payments.infrastructure

import scala.xml.Node

import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.Uri.Path
import akka.http.scaladsl.model.Uri.Query
import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils.DefaultXmlNodeReaders._
import phoenix.core.XmlUtils.NoDescendantWithName
import phoenix.core.XmlUtils.XmlFormat
import phoenix.core.XmlUtils.XmlNodeReader
import phoenix.core.XmlUtils.XmlWriter
import phoenix.core.XmlUtils._
import phoenix.core.currency.DefaultCurrency
import phoenix.core.currency.formatForDisplay
import phoenix.payments.domain.PaymentMethod.CashWithdrawal
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.domain.PaymentReference
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.RedirectToPaymentScreenUrl
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.domain.TransactionStatus._
import phoenix.payments.infrastructure.PxpPaymentsService.CreateCashWithdrawalHTTPRequest
import phoenix.payments.infrastructure.PxpPaymentsService.CreateCashWithdrawalHTTPResponse
import phoenix.payments.infrastructure.PxpPaymentsService.ExecutePaymentActionHTTPRequest
import phoenix.payments.infrastructure.PxpPaymentsService.ExecutePaymentActionHTTPResponse
import phoenix.payments.infrastructure.PxpPaymentsService.GetRedirectDataHTTPResponse
import phoenix.payments.infrastructure.PxpPaymentsService.GetRedirectToPaymentScreenHTTPRequest

private[infrastructure] object PaymentsXmlFormats {

  implicit val requestDataXmlReader: XmlNodeReader[PaymentReference] =
    node =>
      (node \\ "dataField")
        .find(elem => (elem \ "key").text == "requestData")
        .flatMap(node => (node \ "value").headOption.map(_.text))
        .map(url => PaymentReference(url).validNel)
        .getOrElse(NoDescendantWithName("dataField/key/requestData").invalidNel)

  implicit val redirectUrlXmlReader: XmlNodeReader[RedirectToPaymentScreenUrl] =
    node => RedirectToPaymentScreenUrl(node.text.trim).validNel

  implicit val redirectDataXmlReader: XmlNodeReader[PaymentSessionStarted] =
    node => {
      val redirectUrlResult = node.convertFirstDescendantTo[RedirectToPaymentScreenUrl]("redirectUrl")
      val requestDataResult = node.convertTo[PaymentReference]

      (redirectUrlResult, requestDataResult).mapN(PaymentSessionStarted.apply)
    }

  implicit val getRedirectDataHTTPResponseXmlReader: XmlNodeReader[GetRedirectDataHTTPResponse] =
    node => node.convertFirstDescendantTo[PaymentSessionStarted]("redirectData").map(GetRedirectDataHTTPResponse)

  implicit object GetRedirectToPaymentScreenHTTPRequestWriter extends XmlWriter[GetRedirectToPaymentScreenHTTPRequest] {
    override def write(request: GetRedirectToPaymentScreenHTTPRequest): Node = {
      val redirectUrls = RedirectUrls(request.origin, request.transaction)

      <getRedirectDataRequest xmlns="http://www.cqrpayments.com/PaymentProcessing"
                              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                              xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <merchantID>{request.merchantId.value}</merchantID>
        <redirectParameters xsi:type="paymentMethodSelectionWithDetailsRedirectParameters">
          <shopID>{request.shopId.value}</shopID>
          <httpMethod>POST</httpMethod>
          <returnUrl>{redirectUrls.returnUrl}</returnUrl>
          <languageCode>EN</languageCode>
          <currencyCode>{DefaultCurrency.symbol}</currencyCode>
          <countryCode>US</countryCode>
          <additionalDetails>
            <detail xsi:type="keyStringValuePair">
              <key>PaymentMethodSelectionProfile</key>
              <value>OnlinePayment</value>
            </detail>
          </additionalDetails>
          <user>
            <id>{request.transaction.punterId.value}</id>
            <username>{request.userDetails.userName.value}</username>
            <firstname>{request.userDetails.name.firstName.value}</firstname>
            <lastname >{request.userDetails.name.lastName.value}</lastname>
            <currencyCode>{DefaultCurrency.symbol}</currencyCode>
            <languageCode>EN</languageCode>
            <email>{request.userDetails.email.value}</email>
            <address>
              <street>{request.userDetails.address.addressLine.value}</street>
              <postalCode>{request.userDetails.address.zipcode.value}</postalCode>
              <city>{request.userDetails.address.city.value}</city>
              <state>{request.userDetails.address.state.value}</state>
              <countryCode2>US</countryCode2>
              <telephoneNumber>{request.userDetails.phoneNumber.value}</telephoneNumber>
            </address>
            <dateOfBirth>{request.userDetails.dateOfBirth.toOffsetDateTime.toIsoLocalDateTimeString}</dateOfBirth>
          </user>
          <merchantTransactionID>{request.transaction.transactionId.value}</merchantTransactionID>
          <grossAmount>{formatForDisplay(request.transaction.amount.amount)}</grossAmount>
          <expirationTimeSpanInSeconds>900</expirationTimeSpanInSeconds>
          <successUrl>{redirectUrls.successUrl}</successUrl>
          <pendingUrl>{redirectUrls.pendingUrl}</pendingUrl>
          <errorUrl>{redirectUrls.errorUrl}</errorUrl>
          <cancelUrl>{redirectUrls.cancelUrl}</cancelUrl>
          <refusedUrl>{redirectUrls.refusedUrl}</refusedUrl>
          <paymentDirection>{request.transaction.direction.nameAsWord}</paymentDirection>
        </redirectParameters>
      </getRedirectDataRequest>
    }

    private final case class RedirectUrls(origin: PaymentOrigin, transaction: PaymentTransaction) {
      val returnUrl: String = transactionUrl(Interrupted)
      // This is on purpose. For example, when doing deposit, the end user is being redirected to the success page,
      // but we can still reject the payment ie due to limit breach.
      // When setting it to 'Pending', we inform frontend to query for the transaction status
      val successUrl: String = transactionUrl(Pending)
      val pendingUrl: String = transactionUrl(Pending)
      val errorUrl: String = transactionUrl(Failed)
      val cancelUrl: String = transactionUrl(Cancelled)
      val refusedUrl: String = transactionUrl(Refused)

      private def transactionUrl(transactionStatus: TransactionStatus): String = {
        Uri(origin.originHost)
          .withPath(Path("/cashier/transaction/")) // pxp expects trailing '/' in case we set query params
          .withQuery(
            Query(
              "txStatus" -> transactionStatus.entryName,
              "txId" -> transaction.transactionId.value,
              "txDirection" -> transaction.direction.nameAsWord))
          .toString()
      }
    }
  }

  implicit val executePaymentActionHTTPRequestFormat: XmlFormat[ExecutePaymentActionHTTPRequest] = XmlFormat.writeOnly {
    request =>
      <executePaymentActionRequest xmlns="http://www.cqrpayments.com/PaymentProcessing" 
                                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                                   xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <merchantID>{request.merchantId.value}</merchantID>
        <shopID>{request.shopId.value}</shopID>
        <paymentID>{request.paymentId.value}</paymentID>
        <actionID>{request.action}</actionID>
        <remark>{request.remark}</remark>
      </executePaymentActionRequest>
  }

  implicit val executePaymentActionHTTPResponseFormat: XmlFormat[ExecutePaymentActionHTTPResponse] =
    XmlFormat.readOnly { response =>
      response.convertFirstDescendantTo[Int]("statusCode").map(ExecutePaymentActionHTTPResponse)
    }

  implicit val createCashWithdrawalHTTPRequestWriter: XmlWriter[CreateCashWithdrawalHTTPRequest] =
    request => <initiatePaymentRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                                       xmlns="http://www.cqrpayments.com/PaymentProcessing">
      <merchantID>{request.merchantId.value}</merchantID>
      <shopID>{request.shopId.value}</shopID>
      <merchantTransactionID>{request.transaction.transactionId.value}</merchantTransactionID>
      <paymentMethodID>{CashWithdrawal.id}</paymentMethodID>
      <amount currencyCode={DefaultCurrency.symbol}>{formatForDisplay(request.transaction.amount.amount)}</amount>
      <userID>{request.transaction.punterId.value}</userID>
      <userData>
        <username>{request.userDetails.userName.value}</username>
        <firstname>{request.userDetails.name.firstName.value}</firstname>
        <lastname>{request.userDetails.name.lastName.value}</lastname>
        <email>{request.userDetails.email.value}</email>
        <address>
          <street>{request.userDetails.address.addressLine.value}</street>
          <postalCode>{request.userDetails.address.zipcode.value}</postalCode>
          <city>{request.userDetails.address.city.value}</city>
          <state>{request.userDetails.address.state.value}</state>
          <countryCode2>{request.userDetails.address.country.value}</countryCode2>
          <telephoneNumber>{request.userDetails.phoneNumber.value}</telephoneNumber>
        </address>
        <dateOfBirth>{request.userDetails.dateOfBirth.toOffsetDateTime.toIsoLocalDateTimeString}</dateOfBirth>
        <identificationNumber>{request.userDetails.ssn.maskedForDisplay}</identificationNumber>
      </userData>
      <userSessionID>{request.sessionId.value}</userSessionID>
      <creationTypeID>1</creationTypeID>
    </initiatePaymentRequest>

  implicit val createCashWithdrawalHTTPResponseReader: XmlNodeReader[CreateCashWithdrawalHTTPResponse.type] =
    _ => CreateCashWithdrawalHTTPResponse.validNel
}
