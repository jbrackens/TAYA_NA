package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{SettlementDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.mappers.OperationTypes

class SettlementDataToTopupDataSpec extends BaseTestSpec  {

  class Mapper extends SettlementDataToTopupData

  "Mapper" should {

    "map user details" in {
      // given
      val source = SettlementDataProvider.apply.single
      val config = ConfigurationLoader.apply

      // when
      val result = new Mapper().mapToTarget(source, config, SourcesDataProvider.redZoneSposts)(0)

      // then
      result.f0 = 20237719
      result.f1.getAmount should be(7.5)
      result.f1.getCompanyId should be(SourcesDataProvider.redZoneSposts.uuid)
      result.f1.getCreatedDate should be(1553187864239l)
      result.f1.getExternalTransactionId should be("636887846644036359")
      result.f1.getExternalUserId should be("19948956")
      result.f1.getOperationSubtype should be(OperationTypes.STD)
      result.f1.getCreatedDateValue should be("2019-03-21T17:04:24Z")
    }


    "should divide stake with double part" in {

      // given
      val source = SettlementDataProvider.apply.single

      val bet = source.getPurchase.getBets.get(0)
      bet.setStake(170036l)

      SettlementDataToTopupData.betToStake(bet).apply() should be(17.0036)
    }
  }

}
