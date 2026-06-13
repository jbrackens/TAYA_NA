package phoenix.payments.infrastructure.http

import scala.xml.Node

import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.core.XmlUtils.DefaultXmlNodeReaders._
import phoenix.core.XmlUtils.ValidationResult
import phoenix.core.XmlUtils.XmlNodeReader
import phoenix.core.XmlUtils._
import phoenix.core.currency.DefaultCurrency
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.core.validation.Validation.Validation
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.xmlErrorOr
import phoenix.payments.domain.CreationType
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentMethod
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.PaymentStateChangedNotificationResponse
import phoenix.payments.domain.StateDefinition
import phoenix.payments.domain.TransactionId
import phoenix.punters.PunterEntity.PunterId

object PaymentStateChangeNotificationsXmlFormats {
  private implicit object DefaultCurrencyMoneyXmlReader extends XmlNodeReader[DefaultCurrencyMoney] {
    override def read(node: Node): ValidationResult[DefaultCurrencyMoney] = {
      val amountNode = node \\ "amount"
      val currencyCode = amountNode \@ "currencyCode"

      xmlErrorOr[(String, String), DefaultCurrencyMoney](
        { case (amount, code) => parseDefaultCurrencyMoney(amount, code) },
        (amountNode.text, currencyCode))
    }

    private def parseDefaultCurrencyMoney(amount: String, currencyCode: String): Validation[DefaultCurrencyMoney] = {
      val moneyAmount = BigDecimal(amount.trim).validNel
      val currency = DefaultCurrency.fromString(currencyCode.trim())

      (moneyAmount, currency).mapN((amount, currency) => DefaultCurrencyMoney(amount, currency))
    }
  }

  implicit val paymentStateChangedNotificationFormat: XmlFormat[PaymentStateChangedNotification] = XmlFormat.readOnly {
    node =>
      {
        val punterId: ValidationResult[PunterId] = (node \\ "userID").convertHead[String].map(PunterId.apply)
        val transactionId: ValidationResult[TransactionId] =
          (node \\ "merchantTransactionID").convertHead[String].map(TransactionId.apply)
        val paymentId: ValidationResult[PaymentId] =
          (node \\ "paymentID").convertHead[String].map(PaymentId)
        val amount: ValidationResult[PositiveAmount[DefaultCurrencyMoney]] =
          node
            .convertTo[DefaultCurrencyMoney]
            .andThen(amount => xmlErrorOr(PositiveAmount.ensure[DefaultCurrencyMoney], amount))
        val paymentMethod: ValidationResult[PaymentMethod] =
          (node \\ "paymentMethod" \ "key")
            .convertHead[Int]
            .andThen(intValue => xmlErrorOr(PaymentMethod.fromInt, intValue))
        val stateDefinition: ValidationResult[StateDefinition] =
          (node \\ "definition" \ "key")
            .convertHead[Int]
            .andThen(intValue => xmlErrorOr(StateDefinition.fromInt, intValue))
        val creationType: ValidationResult[CreationType] =
          (node \\ "creationType" \ "key")
            .convertHead[Int]
            .andThen(intValue => xmlErrorOr(CreationType.fromInt, intValue))

        (punterId, transactionId, paymentId, amount, paymentMethod, stateDefinition, creationType).mapN(
          PaymentStateChangedNotification.apply)
      }
  }

  implicit val paymentStateChangedResponseFormat: XmlFormat[PaymentStateChangedNotificationResponse] =
    XmlFormat.writeOnly(response => <handlePaymentStateChangedNotificationResponse 
      xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
      xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <resultCode>
          <key>{response.key}</key>
          <value>{response.value}</value>
        </resultCode>
        <resultMessage/>
      </handlePaymentStateChangedNotificationResponse>)
}
