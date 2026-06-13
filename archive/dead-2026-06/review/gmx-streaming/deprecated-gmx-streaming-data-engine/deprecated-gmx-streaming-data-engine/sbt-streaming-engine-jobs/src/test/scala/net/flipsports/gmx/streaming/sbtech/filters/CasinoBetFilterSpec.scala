package net.flipsports.gmx.streaming.sbtech.filters

import java.time.Instant

import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.sbtech.filters.v1.CasinoBetFilter

class CasinoBetFilterSpec extends BaseTestSpec {

  class Filter extends CasinoBetFilter

  "Casino bet filter" must {

    val objectUnderTest = new Filter

    "reject amount if its under 0.01" in {
      // given
      val topupData = prepareTopupData(0.01)

      // when
      val result = objectUnderTest.filterTargetRow(topupData, null)

      // then
      result should be(false)
    }

    "accept amount if its over 0.01" in {
      // given
      val topupData = prepareTopupData(0.02)

      // when
      val result = objectUnderTest.filterTargetRow(topupData, null)

      // then
      result should be(true)
    }

  }

  private def prepareTopupData(amount: Double) = {
    val customerId: Long = 1l
    val data = new CasinoAndSportBetsTopupData()
    data.setAmount(amount)
    data.setCompanyId("")
    data.setTitle("Casino Spin Reward")
    data.setCreatedDate(Instant.now.toEpochMilli)
    new org.apache.flink.api.java.tuple.Tuple2(customerId, data)
  }

}
