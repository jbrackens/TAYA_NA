package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.EmailType
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class EmailEqualsSpec extends StreamingTestBase {

  val gmail = new EmailEquals(EmailType.Gmail)
  val outlook = new EmailEquals(EmailType.Outlook)
  val yahoo = new EmailEquals(EmailType.Yahoo)

  "EmailEquals" should {

    "equals true when emailType = Gmail" in {
      // given
      val customerSingle = CustomerDetailsDataProvider().single
      customerSingle.f1.setEmail("testemail@gmail.com")

      //then
      gmail.test(customerSingle.f1) shouldEqual true
    }

    "equals true when emailType = outlook" in {
      // given
      val customerSingle = CustomerDetailsDataProvider().single
      customerSingle.f1.setEmail("testemail@outlook.com")

      //then
      outlook.test(customerSingle.f1) shouldEqual true
    }

    "equals true when emailType = yahoo" in {
      // given
      val customerSingle = CustomerDetailsDataProvider().single
      customerSingle.f1.setEmail("testemail@yahoo.com")

      //then
      yahoo.test(customerSingle.f1) shouldEqual true
    }
  }
}
