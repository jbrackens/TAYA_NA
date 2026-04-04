package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{CasinoBetDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig

class CasinoBetToTopupDataSpec extends BaseTestSpec {

  class Mapper extends CasinoBetToTopupData

  "CasinoBetToTopupData mapper" should {

    "Map bet" in {
      // given
      val betPOJO = CasinoBetDataProvider.single
      val config =
        SbTechConfig(null, null, null, false, SourcesDataProvider.sources, null, "/tmp/flink/checkpoint")

      // when
      val result = new Mapper().mapToTarget(betPOJO, config, SourcesDataProvider.redZoneSposts)

      // then
      result.f0 shouldBe(CasinoBetDataProvider.CustomerID)
      result.f1.getAmount should be(0.75)
      result.f1.getExternalUserId should be(CasinoBetDataProvider.CustomerID.toString)
      result.f1.getTitle should be("Casino Spin Reward")
      result.f1.getCompanyId should be(SourcesDataProvider.redZoneSposts.uuid)
      result.f1.getOperationSubtype should be("STD")
    }
  }

}
