package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{SettlementDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader

class PartialCashOutDataFilterSpec extends BaseTestSpec {

  class Mapper extends SettlementDataToTopupData

  "Mapper" should {

    "map settled partial cashout" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-partial-cashout-settled.json").single
      val config = ConfigurationLoader.apply

      // when
      val result = new Mapper().mapToTarget(source, config, SourcesDataProvider.redZoneSposts)

      // then

      result.seq.size should be(1)
    }


    "filter settled partial cashout" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-partial-cashout-subbet-open.json").single
      val config = ConfigurationLoader.apply

      // when
      val result = new Mapper().mapToTarget(source, config, SourcesDataProvider.redZoneSposts)

      // then

      result.seq.size should be(0)
    }



    "map souble bets" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-double-combobets.json").single
      val config = ConfigurationLoader.apply

      // when
      val result = new Mapper().mapToTarget(source, config, SourcesDataProvider.redZoneSposts)

      // then
      result.seq.size should be(1)
    }

    "not filter settled partial cashout without reference" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-partial-cashout-subbet-open-without-ref.json").single
      val config = ConfigurationLoader.apply

      // when
      val result = new Mapper().mapToTarget(source, config, SourcesDataProvider.redZoneSposts)

      // then

      result.seq.size should be(2)
    }


  }

}
