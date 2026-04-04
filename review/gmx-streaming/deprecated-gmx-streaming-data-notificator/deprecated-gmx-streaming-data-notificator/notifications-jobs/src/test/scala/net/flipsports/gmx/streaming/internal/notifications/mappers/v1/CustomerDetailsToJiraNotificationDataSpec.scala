package net.flipsports.gmx.streaming.internal.notifications.mappers.v1

import net.flipsports.gmx.dataapi.internal.notificator.notifications.Jira
import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.data.v1.CustomerDetailsDataProvider

class CustomerDetailsToJiraNotificationDataSpec extends BaseTestSpec  {

  class Mapper(brand: Brand) extends CustomerDetailsToJiraNotificationData(brand)

  "Mapper" should {

    "map user details" in {
      // given
      val source = CustomerDetailsDataProvider.single

      // when
      val result = new Mapper(Brand.redZone).map(source)

      // then
      result.f0.toString shouldBe(CustomerDetailsDataProvider.externalUserId.toString)
      result.f1.getPayload.asInstanceOf[Jira].getExternalUserId.toString should be(CustomerDetailsDataProvider.externalUserId.toString)
      result.f1.getPayload.asInstanceOf[Jira].getCompanyId should be(Brand.redZone.sourceBrand.uuid)
    }
  }

}
