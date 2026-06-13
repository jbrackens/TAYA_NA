package gmx.users.internal.source.sbtech

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import gmx.dataapi.internal.customer.DepositLimitScopeEnum
import gmx.users.internal.CustomerDetailDataProvider
import gmx.users.internal.aggregate.{ SetDepositLimit, SetTimeout }
import org.mockito.MockitoSugar
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers._
import org.scalatest.wordspec.AnyWordSpecLike

class SbTechCustomerDetailProcessorSpec extends AnyWordSpecLike with GivenWhenThen with MockitoSugar {

  private val dataFormatter = DateTimeFormatter.ofPattern("yyy-MM-dd HH:mm:ss,SSSxxx")

  private val objectUnderTest = SbTechCustomerDetailProcessor

  "SbTechCustomerDetailProcessor" should {

    "convert CustomerDetail kafka message into commands" in {
      Given("an Avro message")
      val givenBrand    = "sportNation"
      val givenMessages = new CustomerDetailDataProvider("/gmx/users/internal/source/sbtech/CustomerDetail-sample.json").all

      When("produce command is invoked")
      val actualCommand1 = objectUnderTest.extractCommands(givenBrand, givenMessages(0))
      val actualCommand2 = objectUnderTest.extractCommands(givenBrand, givenMessages(1))

      Then("result should be properly initialized")
      actualCommand1 should have size (1)
      val setDepositLimit1 = actualCommand1(0).asInstanceOf[SetDepositLimit]
      setDepositLimit1.processingHeader.messageId should not be (null)
      setDepositLimit1.processingHeader.messageProcessingDate should not be (null)
      setDepositLimit1.processingHeader.messageOriginDate should be(ZonedDateTime.parse("2020-08-04 15:44:45,389+00:00", dataFormatter))
      setDepositLimit1.customerHeader.brandId should be("sportNation")
      setDepositLimit1.customerHeader.customerId should be("13389329")
      setDepositLimit1.limit.scope should be(DepositLimitScopeEnum.Weekly)
      setDepositLimit1.limit.limit should be(BigDecimal.apply(500.00))
      setDepositLimit1.limit.setBy.userId should be("13389329")
      setDepositLimit1.limit.setBy.setAt should be(ZonedDateTime.parse("2020-08-04 15:44:45,210+00:00", dataFormatter))

      actualCommand2 should have size (2)
      val setDepositLimit2 = actualCommand2(0).asInstanceOf[SetDepositLimit]
      setDepositLimit2.processingHeader.messageId should not be (null)
      setDepositLimit2.processingHeader.messageProcessingDate should not be (null)
      setDepositLimit2.processingHeader.messageOriginDate should be(ZonedDateTime.parse("2020-08-04 15:50:28,792+00:00", dataFormatter))
      setDepositLimit2.customerHeader.brandId should be("sportNation")
      setDepositLimit2.customerHeader.customerId should be("13389329")
      setDepositLimit2.limit.scope should be(DepositLimitScopeEnum.Daily)
      setDepositLimit2.limit.limit should be(BigDecimal.apply(50.0))
      setDepositLimit2.limit.setBy.userId should be("0")
      setDepositLimit2.limit.setBy.setAt should be(ZonedDateTime.parse("2020-08-04 15:50:28,577+00:00", dataFormatter))

      val setTimeout2 = actualCommand2(1).asInstanceOf[SetTimeout]
      setTimeout2.processingHeader.messageId should not be (null)
      setTimeout2.processingHeader.messageProcessingDate should not be (null)
      setTimeout2.processingHeader.messageOriginDate should be(ZonedDateTime.parse("2020-08-04 15:50:28,792+00:00", dataFormatter))
      setTimeout2.customerHeader.brandId should be("sportNation")
      setTimeout2.customerHeader.customerId should be("13389329")
      setTimeout2.timeout.startTime should be(ZonedDateTime.parse("2020-08-04 15:50:08,480+00:00", dataFormatter))
      setTimeout2.timeout.endTime should be(ZonedDateTime.parse("2020-08-05 15:50:08,477+00:00", dataFormatter))
      setTimeout2.timeout.setBy.userId should be("0")
      setTimeout2.timeout.setBy.setAt should be(ZonedDateTime.parse("2020-08-04 15:50:28,577+00:00", dataFormatter))

    }
  }
}
