package gmx.users.internal.source.sbtech

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import gmx.dataapi.internal.customer.{ DepositPaymentMethodEnum, DepositStatusEnum }
import gmx.users.internal.WalletTransactionDataProvider
import gmx.users.internal.aggregate.DepositFunds
import org.mockito.MockitoSugar
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers.{ be, _ }
import org.scalatest.wordspec.AnyWordSpecLike

class SbTechWalletTransactionProcessorSpec extends AnyWordSpecLike with GivenWhenThen with MockitoSugar {

  private val dataFormatter = DateTimeFormatter.ofPattern("yyy-MM-dd HH:mm:ss,SSSxxx")

  private val objectUnderTest = SbTechWalletTransactionProcessor

  "SbTechWalletTransactionProcessor" should {

    "convert WalletTransaction kafka message into commands" in {
      Given("an Avro message")
      val givenBrand    = "sportNation"
      val givenMessages = new WalletTransactionDataProvider("/gmx/users/internal/source/sbtech/WalletTransaction-sample.json").all

      When("produce command is invoked")
      val actualCommand1 =
        objectUnderTest.extractCommands(givenBrand, givenMessages(0))
      val actualCommand2 =
        objectUnderTest.extractCommands(givenBrand, givenMessages(1))
      val actualCommand3 =
        objectUnderTest.extractCommands(givenBrand, givenMessages(2))
      val actualCommand4 =
        objectUnderTest.extractCommands(givenBrand, givenMessages(3))

      Then("result should be properly initialized")
      actualCommand1 should have size (1)
      val depositFunds1 = actualCommand1(0).asInstanceOf[DepositFunds]
      depositFunds1.processingHeader.messageId should not be (null)
      depositFunds1.processingHeader.messageProcessingDate should not be (null)
      depositFunds1.processingHeader.messageOriginDate should be(ZonedDateTime.parse("2020-08-01 12:50:29,604+00:00", dataFormatter))
      depositFunds1.customerHeader.brandId should be("sportNation")
      depositFunds1.customerHeader.customerId should be("1337403966")
      depositFunds1.deposit.transactionId should be("3520688930")
      depositFunds1.deposit.depositedAt should be(ZonedDateTime.parse("2020-08-01 12:50:21,727+00:00", dataFormatter))
      depositFunds1.deposit.amount should be(BigDecimal.apply(25.00))
      depositFunds1.deposit.paymentMethod should be(DepositPaymentMethodEnum.DebitCard)
      depositFunds1.deposit.status should be(DepositStatusEnum.Confirmed)
      depositFunds1.deposit.paymentAccountIdentifier should be("Card Number: 4****9403;")
      depositFunds1.deposit.paymentDetails should be(
        "Provider: safecharge_visa; Gateway: safecharge; Gateway Transaction Id: 1130000001013519237."
      )
      depositFunds1.deposit.gatewayCorrelationId should be("EPS Log Correlation Id: 5E014B21-B4B4-40A6-817C-8D58B99C1E42.")

      actualCommand2 should have size (1)
      val depositFunds2 = actualCommand2(0).asInstanceOf[DepositFunds]
      depositFunds2.processingHeader.messageId should not be (null)
      depositFunds2.processingHeader.messageProcessingDate should not be (null)
      depositFunds2.processingHeader.messageOriginDate should be(ZonedDateTime.parse("2020-08-08 16:20:39,192+00:00", dataFormatter))
      depositFunds2.customerHeader.brandId should be("sportNation")
      depositFunds2.customerHeader.customerId should be("1337403966")
      depositFunds2.deposit.transactionId should be("2617258633")
      depositFunds2.deposit.depositedAt should be(ZonedDateTime.parse("2020-08-08 16:18:36,413+00:00", dataFormatter))
      depositFunds2.deposit.amount should be(BigDecimal.apply(40.0))
      depositFunds2.deposit.paymentMethod should be(DepositPaymentMethodEnum.ApplePay)
      depositFunds2.deposit.status should be(DepositStatusEnum.Declined)
      depositFunds2.deposit.paymentAccountIdentifier should be("")
      depositFunds2.deposit.paymentDetails should be("Reason: ThreeDAuthorizationFailed;")
      depositFunds2.deposit.gatewayCorrelationId should be("EPS Log Correlation Id: 84A394F3-C0A1-41E2-82C0-21F3462B4280.")

      actualCommand3 should have size (0)

      actualCommand4 should have size (0)
    }
  }
}
