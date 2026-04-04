package gmx.widget.siteextentions.datafeed.service.persistence.patching

import tech.argyll.video.domain.model.MarketModel
import tech.argyll.video.domain.model.MarketType
import tech.argyll.video.domain.test.shared.DomainObjectAssertions.checkBasicMarket
import tech.argyll.video.domain.test.shared.DomainObjectFactory.createMarket

import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.module.PersistenceModule
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleMarketUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerEventUpdate

class MarketModelPatcherSpec extends BaseSpec {

  val objectUnderTest: MarketModelPatcher =
    (new PersistenceModule(MessageToRetryPersistenceConfig.dummy)).marketModelPatcher

  "A MarketModelPatcher" should {
    "fill new Market" in {
      Given("Avro message with new Market")
      val givenEvent = sampleSoccerEventUpdate
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenModel = fillAutoFields(new MarketModel)

      When("fillNewMarket is executed")
      objectUnderTest.fillNewMarket(givenModel, givenMarket)

      Then("all fields are correct")
      checkBasicMarket(givenModel, createMarket(givenMarket.marketId, givenMarket.marketType))
      givenModel.getRefIntId.toString should be(givenMarket.marketId)
      givenModel.getRefIdOldFormat should be(null)
      givenModel.getSelections should have size (0)
    }

    "fill existing Market" in {
      Given("existing Market initialized from update")
      val givenEvent = sampleSoccerEventUpdate
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenModel = fillAutoFields(new MarketModel)
      objectUnderTest.fillNewMarket(givenModel, givenMarket)

      val givenRefIntId = 99
      val givenRefOldId = "oldRef"
      givenModel.setRefIntId(givenRefIntId)
      givenModel.setRefIdOldFormat(givenRefOldId)

      And("followed by update message with meaningful fields changed")
      val updatedMarketWithMeaningfulFields = givenMarket.copy(marketId = "newID")

      And("followed by update message with ignored fields")
      val updatedMarketWithIgnoredFields =
        updatedMarketWithMeaningfulFields.copy(
          eventId = "ignored",
          marketType = MarketType.SPECIAL_BETS,
          marketName = "ignored")

      When("fillExistingMarket is executed")
      objectUnderTest.fillExistingMarket(givenModel, updatedMarketWithMeaningfulFields)
      objectUnderTest.fillExistingMarket(givenModel, updatedMarketWithIgnoredFields)

      Then("ONLY meaningful fields are updated")
      checkBasicMarket(givenModel, createMarket(updatedMarketWithMeaningfulFields.marketId, givenMarket.marketType))
      givenModel.getRefIntId should be(givenRefIntId)
      givenModel.getRefIdOldFormat should be(givenRefOldId)
      givenModel.getSelections should have size (0)
    }
  }

  def fillAutoFields(model: MarketModel): MarketModel = {
    model.setId("unRel")
    fillTimestamps(model)

    model
  }

}
