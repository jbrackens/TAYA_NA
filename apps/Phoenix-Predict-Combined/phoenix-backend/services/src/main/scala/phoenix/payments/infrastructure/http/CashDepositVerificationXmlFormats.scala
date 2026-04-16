package phoenix.payments.infrastructure.http

import scala.xml.Node

import cats.data.NonEmptyList
import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.core.TimeUtils.TimeUtilsOffsetDateTimeOps
import phoenix.core.XmlUtils.DefaultXmlNodeReaders._
import phoenix.core.XmlUtils._
import phoenix.core.currency.DefaultCurrency
import phoenix.core.currency.formatForDisplay
import phoenix.payments.domain._
import phoenix.punters.domain.Email
import phoenix.punters.domain.Username

object CashDepositVerificationXmlFormats {

  implicit val cashDepositVerificationRequestReader: XmlFormat[CashDepositVerificationRequest] =
    XmlFormat.readOnly(request => {
      val maybeUsername: ValidationResult[Option[Username]] = (request \\ "username")
        .convertHeadOption[String]
        .map(maybeUsername => maybeUsername.filterNot(_.isBlank).flatMap(parseUsername(_).toOption))

      val maybeEmail: ValidationResult[Option[Email]] = (request \\ "email")
        .convertHeadOption[String]
        .andThen(maybeEmail =>
          maybeEmail.filterNot(_.isBlank) match {
            case Some(email) => parseEmail(email).map(Some(_))
            case None        => None.validNel
          })

      (maybeUsername, maybeEmail).tupled.andThen {
        case (Some(username), Some(email)) => UsernameAndEmailCashDepositVerification(username, email).validNel
        case (Some(username), None)        => UsernameCashDepositVerification(username).validNel
        case (None, Some(email))           => EmailCashDepositVerification(email).validNel
        case (None, None)                  => UnexpectedValueError("Expected either 'email' or 'username' received neither").invalidNel
      }
    })

  private def parseEmail(email: String): ValidationResult[Email] =
    Email.fromString(email).leftMap(errors => NonEmptyList.one(InvalidAttributeValue(errors)))

  private def parseUsername(username: String): ValidationResult[Username] =
    Username(username).leftMap(errors => NonEmptyList.one(InvalidAttributeValue(errors)))

  implicit val cashDepositVerificationResponseWriter: XmlFormat[CashDepositVerificationResponse] = XmlFormat.writeOnly {
    new XmlWriter[CashDepositVerificationResponse] {
      override def write(response: CashDepositVerificationResponse): Node =
        response match {
          case success: CashDepositVerificationSuccessResponse => writeSuccessResponse(success)
          case failure: CashDepositVerificationFailureResponse => writeFailureResponse(failure)
        }

      private def writeFailureResponse(response: CashDepositVerificationFailureResponse): Node =
        <getNewManualPaymentDetailsResponse xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <status>
            <code xmlns="http://www.cqrpayments.com/PaymentProcessing">{response.code}</code>
            <description xmlns="http://www.cqrpayments.com/PaymentProcessing">{response.description}</description>
            <details xmlns="http://www.cqrpayments.com/PaymentProcessing">{response.message}</details>
          </status>
        </getNewManualPaymentDetailsResponse>

      private def writeSuccessResponse(response: CashDepositVerificationSuccessResponse): Node =
        <getNewManualPaymentDetailsResponse xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <result>
            <userID xmlns="http://www.cqrpayments.com/PaymentProcessing">{response.punterId.value}</userID>
            <merchantTransactionID xmlns="http://www.cqrpayments.com/PaymentProcessing">{response.transactionId.value}</merchantTransactionID>
            <userDetails xmlns="http://www.cqrpayments.com/PaymentProcessing">
              <username>{response.userDetails.userName.value}</username>
              <firstname>{response.userDetails.name.firstName.value}</firstname>
              <lastname>{response.userDetails.name.lastName.value}</lastname>
              <currencyCode>{DefaultCurrency.symbol}</currencyCode>
              <languageCode>en</languageCode>
              <email>{response.userDetails.email.value}</email>
              <address>
                <street>{response.userDetails.address.addressLine.value}</street>
                <postalCode>{response.userDetails.address.zipcode.value}</postalCode>
                <city>{response.userDetails.address.city.value}</city>
                <state>{response.userDetails.address.state.value}</state>
                <countryCode2>{response.userDetails.address.country.value}</countryCode2>
                <telephoneNumber>{response.userDetails.phoneNumber.value}</telephoneNumber>
              </address>
              <dateOfBirth>{response.userDetails.dateOfBirth.toOffsetDateTime.toIsoLocalDateTimeString}</dateOfBirth>
              <identificationNumber>{response.ssn.maskedForDisplay}</identificationNumber>
            </userDetails>
            <paymentDetails xmlns="http://www.cqrpayments.com/PaymentProcessing">
              <detail xsi:type="keyDecimalValuePair">
                <key>MinLimit</key>
                <value>{formatForDisplay(response.paymentLimits.min.amount)}</value>
              </detail>
              <detail xsi:type="keyDecimalValuePair">
                <key>MaxLimit</key>
                <value>{formatForDisplay(response.paymentLimits.max.amount)}</value>
              </detail>
              <detail xsi:type="keyStringValuePair">
                <key>LimitCurrency</key>
                <value>{DefaultCurrency.symbol}</value>
              </detail>
            </paymentDetails>
          </result>
          <status>
            <code xmlns="http://www.cqrpayments.com/PaymentProcessing">0</code>
            <description xmlns="http://www.cqrpayments.com/PaymentProcessing">Success</description>
            <details xmlns="http://www.cqrpayments.com/PaymentProcessing"/>
          </status>
        </getNewManualPaymentDetailsResponse>
    }
  }
}
