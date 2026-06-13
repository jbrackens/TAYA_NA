package phoenix.payments.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec
import sttp.tapir.DecodeResult
import sttp.tapir.DecodeResult.Value
import sttp.tapir.xmlBody

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.domain.CreationType.User
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentMethod.CashWithdrawal
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition.Expired
import phoenix.payments.domain.TransactionId
import phoenix.payments.infrastructure.http.PaymentStateChangeNotificationsXmlFormats._
import phoenix.payments.infrastructure.http.TapirXMLAdapter._
import phoenix.punters.PunterEntity.PunterId

class PaymentStateChangeNotificationsXmlFormatsSpec extends AnyWordSpec with Matchers {

  "should parse an expired notification" in {
    // given
    val stateChangeNotification =
      <handlePaymentStateChangedNotificationRequest xmlns="http://www.cqrpayments.com/PaymentProcessing"
                                                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <payment xsi:type="paymentWithPaymentAccount">
          <merchantID>GMBL_NJ</merchantID>
          <shopID>GMBL_NJ</shopID>
          <paymentMethod>
            <key>174</key>
            <value>CashWithdrawal</value>
          </paymentMethod>
          <merchantTransactionID>deranged-stitch-maid</merchantTransactionID>
          <paymentID>ab655771-5389-4cb6-94a3-8244c2f7d5b5</paymentID>
          <userID>3083ace6-56b2-4462-b02b-e8c120daf1bf</userID>
          <paymentProvider>
            <key>123</key>
            <value>Kalixa</value>
          </paymentProvider>
          <amount currencyCode="USD">50.0000</amount>
          <creationType>
            <key>1</key>
            <value>User</value>
          </creationType>
          <state>
            <id>263375f6-973a-4a01-b6ad-edf9529b2b1a</id>
            <definition>
              <key>102</key>
              <value>Expired</value>
            </definition>
            <createdOn>2022-02-06T10:38:10.663</createdOn>
            <paymentStateDetails>
              <detail xsi:type="keyIntValuePair">
                <key>PaymentStateReasonID</key>
                <value>1</value>
              </detail>
            </paymentStateDetails>
          </state>
          <isExecuted>false</isExecuted>
          <baseAmount currencyCode="USD">50.0000</baseAmount>
          <paymentDetails xsi:nil="true"/>
          <paymentAccount>
            <paymentAccountID>0</paymentAccountID>
          </paymentAccount>
        </payment>
      </handlePaymentStateChangedNotificationRequest>

    // when
    val parsedRequest: DecodeResult[PaymentStateChangedNotification] =
      xmlBody[PaymentStateChangedNotification].codec.decode(stateChangeNotification.toString())

    // then
    parsedRequest should ===(
      new Value[PaymentStateChangedNotification](PaymentStateChangedNotification(
        punterId = PunterId("3083ace6-56b2-4462-b02b-e8c120daf1bf"),
        transactionId = TransactionId("deranged-stitch-maid"),
        paymentId = PaymentId("ab655771-5389-4cb6-94a3-8244c2f7d5b5"),
        amount = PositiveAmount[DefaultCurrencyMoney](DefaultCurrencyMoney(50)),
        paymentMethod = CashWithdrawal,
        stateDefinition = Expired,
        creationType = User)))
  }
}
