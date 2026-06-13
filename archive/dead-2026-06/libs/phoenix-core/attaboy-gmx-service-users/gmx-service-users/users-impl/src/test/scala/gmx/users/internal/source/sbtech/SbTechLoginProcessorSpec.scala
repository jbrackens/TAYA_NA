package gmx.users.internal.source.sbtech

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import gmx.users.internal.LoginDataProvider
import gmx.users.internal.aggregate.LogCustomerIn
import org.mockito.MockitoSugar
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers.{ be, _ }
import org.scalatest.wordspec.AnyWordSpecLike

class SbTechLoginProcessorSpec extends AnyWordSpecLike with GivenWhenThen with MockitoSugar {

  private val dataFormatter = DateTimeFormatter.ofPattern("yyy-MM-dd HH:mm:ss,SSSxxx")

  private val objectUnderTest = SbTechLoginProcessor

  "SbTechLoginProcessor" should {

    "convert Login kafka message into commands" in {
      Given("an Avro message")
      val givenBrand    = "sportNation"
      val givenMessages = new LoginDataProvider("/gmx/users/internal/source/sbtech/Login-sample.json").all

      When("produce command is invoked")
      val actualCommand1 =
        objectUnderTest.extractCommands(givenBrand, givenMessages(0))
      val actualCommand2 =
        objectUnderTest.extractCommands(givenBrand, givenMessages(1))

      Then("result should be properly initialized")
      actualCommand1 should have size (1)
      val logCustomerIn1 = actualCommand1(0).asInstanceOf[LogCustomerIn]
      logCustomerIn1.processingHeader.messageId should not be (null)
      logCustomerIn1.processingHeader.messageProcessingDate should not be (null)
      logCustomerIn1.processingHeader.messageOriginDate should be(ZonedDateTime.parse("2020-08-04 15:40:46,882+00:00", dataFormatter))
      logCustomerIn1.customerHeader.brandId should be("sportNation")
      logCustomerIn1.customerHeader.customerId should be("13389329")
      logCustomerIn1.loggedIn.loggedInAt should be(ZonedDateTime.parse("2020-08-04 15:40:24,813+00:00", dataFormatter))
      logCustomerIn1.loggedIn.deviceType should be("Personal computer")

      actualCommand2 should have size (1)
      val logCustomerIn2 = actualCommand2(0).asInstanceOf[LogCustomerIn]
      logCustomerIn2.processingHeader.messageId should not be (null)
      logCustomerIn2.processingHeader.messageProcessingDate should not be (null)
      logCustomerIn2.processingHeader.messageOriginDate should be(ZonedDateTime.parse("2020-08-04 15:42:07,722+00:00", dataFormatter))
      logCustomerIn2.customerHeader.brandId should be("sportNation")
      logCustomerIn2.loggedIn.loggedInAt should be(ZonedDateTime.parse("2020-08-04 15:41:41,500+00:00", dataFormatter))
      logCustomerIn2.loggedIn.deviceType should be("Personal computer")

    }
  }
}
