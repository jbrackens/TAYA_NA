package phoenix.payments.unit

import cats.data.Validated.Valid
import org.scalatest.Inspectors
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils.XmlNodeReader
import phoenix.payments.domain.CashDepositVerificationRequest
import phoenix.payments.domain.EmailCashDepositVerification
import phoenix.payments.domain.UsernameAndEmailCashDepositVerification
import phoenix.payments.domain.UsernameCashDepositVerification
import phoenix.payments.infrastructure.http.CashDepositVerificationXmlFormats.cashDepositVerificationRequestReader
import phoenix.punters.domain.Email
import phoenix.punters.domain.Username
import phoenix.support.UnsafeValueObjectExtensions._

final class DepositVerificationRequestParsingSpec extends AnyWordSpecLike with Matchers with Inspectors {

  "should properly parse xml request with empty username" in {
    // given
    val noUsernameAtAll =
      <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <merchantID>GMBLNewJerseyDev</merchantID>
        <paymentMethodID>177</paymentMethodID>
        <email>john.doe@example.com</email>
        <languageCode>EN</languageCode>
      </getNewManualPaymentDetailsRequest>

    val emptyUsername =
      <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <merchantID>GMBLNewJerseyDev</merchantID>
        <paymentMethodID>177</paymentMethodID>
        <username xsi:nil="true"/>
        <email>john.doe@example.com</email>
        <languageCode>EN</languageCode>
      </getNewManualPaymentDetailsRequest>

    forEvery(Seq(noUsernameAtAll, emptyUsername)) { xmlRequest =>
      // when
      val parsingResult = XmlNodeReader[CashDepositVerificationRequest].read(xmlRequest)

      // then
      parsingResult shouldBe Valid(EmailCashDepositVerification(Email.fromStringUnsafe("john.doe@example.com")))
    }
  }

  "should properly parse xml request with empty email" in {
    // given
    val noEmailAtAll =
      <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <merchantID>GMBLNewJerseyDev</merchantID>
        <paymentMethodID>177</paymentMethodID>
        <username>john.doe</username>
        <languageCode>EN</languageCode>
      </getNewManualPaymentDetailsRequest>

    val emptyEmail =
      <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <merchantID>GMBLNewJerseyDev</merchantID>
        <paymentMethodID>177</paymentMethodID>
        <username>john.doe</username>
        <email xsi:nil="true"/>
        <languageCode>EN</languageCode>
      </getNewManualPaymentDetailsRequest>

    forEvery(Seq(noEmailAtAll, emptyEmail)) { xmlRequest =>
      // when
      val parsingResult = XmlNodeReader[CashDepositVerificationRequest].read(xmlRequest)

      // then
      parsingResult shouldBe Valid(UsernameCashDepositVerification(Username.fromStringUnsafe("john.doe")))
    }
  }

  "should properly parse xml with both username and email" in {
    // given
    val xmlRequest =
      <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <merchantID>GMBLNewJerseyDev</merchantID>
        <paymentMethodID>177</paymentMethodID>
        <username>john.doe</username>
        <email>john.doe@example.com</email>
        <languageCode>EN</languageCode>
      </getNewManualPaymentDetailsRequest>

    // when
    val parsingResult = XmlNodeReader[CashDepositVerificationRequest].read(xmlRequest)

    // then
    parsingResult shouldBe Valid(
      UsernameAndEmailCashDepositVerification(
        Username.fromStringUnsafe("john.doe"),
        Email.fromStringUnsafe("john.doe@example.com")))
  }

  "should fail when there's no email nor username provided" in {
    // given
    val invalidXml =
      <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <merchantID>GMBLNewJerseyDev</merchantID>
        <paymentMethodID>177</paymentMethodID>
        <languageCode>EN</languageCode>
      </getNewManualPaymentDetailsRequest>

    // when
    val parsingResult = XmlNodeReader[CashDepositVerificationRequest].read(invalidXml)

    // then
    parsingResult.isInvalid shouldBe true
  }

  "should fail when there's invalid email provided provided" in {
    // given
    val invalidXml =
      <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
        <merchantID>GMBLNewJerseyDev</merchantID>
        <paymentMethodID>177</paymentMethodID>
        <email>that's not an email</email>
        <languageCode>EN</languageCode>
      </getNewManualPaymentDetailsRequest>

    // when
    val parsingResult = XmlNodeReader[CashDepositVerificationRequest].read(invalidXml)

    // then
    parsingResult.isInvalid shouldBe true
  }
}
