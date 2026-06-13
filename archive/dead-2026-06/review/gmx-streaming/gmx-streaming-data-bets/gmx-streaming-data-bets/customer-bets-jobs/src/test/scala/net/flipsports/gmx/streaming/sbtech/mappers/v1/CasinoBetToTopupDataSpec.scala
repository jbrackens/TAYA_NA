package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.data.v1.CasinoBetDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class CasinoBetToTopupDataSpec extends StreamingTestBase {

  class Mapper(brand: Brand) extends CasinoBetToTopupData(brand)

  "CasinoBetToTopupData mapper" should {

    "Map bet" in {
      // given
      val betPOJO = CasinoBetDataProvider().single

      // when
      val result = new Mapper(Brand.redZone).map(betPOJO)

      // then
      result.f0 shouldBe(CasinoBetDataProvider.CustomerID)
      result.f1.getAmount should be(0.15)
      result.f1.getExternalUserId should be(CasinoBetDataProvider.CustomerID.toString)
      result.f1.getTitle should be("Casino Spin Reward")
      result.f1.getCompanyId should be(Brand.redZone.sourceBrand.uuid)
      result.f1.getOperationSubtype should be("STD")
    }
  }

}
