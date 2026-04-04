package gmx.widget.siteextentions.datafeed.service.persistence.patching

import tech.argyll.video.domain.model.EventModel
import tech.argyll.video.domain.model.MarketModel
import tech.argyll.video.domain.model.SelectionModel
import tech.argyll.video.domain.model.SelectionType
import tech.argyll.video.domain.test.shared.DomainObjectAssertions.checkBasicSelection
import tech.argyll.video.domain.test.shared.DomainObjectFactory.createBasicSelection

import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.module.PersistenceModule
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleMarketUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerEventUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerSelectionUpdate

class SelectionModelPatcherSpec extends BaseSpec {

  val objectUnderTest: SelectionModelPatcher =
    (new PersistenceModule(MessageToRetryPersistenceConfig.dummy)).selectionModelPatcher

  "A SelectionModelPatcher" should {
    "fill new Selection" in {
      Given("Avro message with new Selection")
      val givenEvent = sampleSoccerEventUpdate
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenSelection = sampleSoccerSelectionUpdate(givenMarket).copy(selectionType = SelectionType.DAY_OF_EVENT)

      val givenModel = fillAutoFields(new SelectionModel)
      givenModel.setMarket(new MarketModel)
      givenModel.getMarket.setEvent(new EventModel)
      givenModel.getMarket.getEvent.setSport(givenEvent.sport)

      When("fillNewSelection is executed")
      objectUnderTest.fillNewSelection(givenModel, givenSelection)

      Then("all fields are correct")
      checkBasicSelection(
        givenModel,
        createBasicSelection(
          givenSelection.selectionId,
          givenSelection.selectionType,
          0,
          givenSelection.selectionName,
          givenSelection.displayOdds(SelectionOddsTypeEnum.Fractional)))
      givenModel.getRefIdOldFormat should be(null)
      givenModel.getRefIntId should be(givenSelection.selectionIntId)
    }

    "fill existing Selection" in {
      Given("existing Selection initialized from update")
      val givenEvent = sampleSoccerEventUpdate
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenSelection = sampleSoccerSelectionUpdate(givenMarket).copy(selectionType = SelectionType.DAY_OF_EVENT)

      val givenModel = fillAutoFields(new SelectionModel)
      givenModel.setMarket(new MarketModel)
      givenModel.getMarket.setEvent(new EventModel)
      givenModel.getMarket.getEvent.setSport(givenEvent.sport)

      objectUnderTest.fillNewSelection(givenModel, givenSelection)

      val givenOldRef = "oldRef"
      givenModel.setRefIdOldFormat(givenOldRef)

      And("followed by update message with meaningful fields changed")
      val updatedSelectionWithMeaningfulFields =
        givenSelection.copy(
          selectionId = "newID",
          selectionIntId = -1,
          displayOdds = Map(SelectionOddsTypeEnum.Fractional -> "100/1"))

      And("followed by update message with ignored fields")
      val updatedSelectionWithIgnoredFields =
        updatedSelectionWithMeaningfulFields.copy(selectionName = "ignored", trueOdds = -100)

      When("fillExistingSelection is executed")
      objectUnderTest.fillExistingSelection(givenModel, updatedSelectionWithMeaningfulFields)
      objectUnderTest.fillExistingSelection(givenModel, updatedSelectionWithIgnoredFields)

      Then("ONLY meaningful fields are updated")

      And("ONLY meaningful fields are updated")
      checkBasicSelection(
        givenModel,
        createBasicSelection(
          updatedSelectionWithMeaningfulFields.selectionId,
          givenSelection.selectionType,
          0,
          givenSelection.selectionName,
          updatedSelectionWithMeaningfulFields.displayOdds(SelectionOddsTypeEnum.Fractional)))
      givenModel.getRefIdOldFormat should be(givenOldRef)
      givenModel.getRefIntId should be(updatedSelectionWithMeaningfulFields.selectionIntId)
    }

    "handle empty odds for STARTING_PRICE type" in {
      Given("Avro message with STARTING_PRICE Selection")
      val givenEvent = sampleSoccerEventUpdate
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenSelection =
        sampleSoccerSelectionUpdate(givenMarket).copy(selectionType = SelectionType.STARTING_PRICE, displayOdds = Map())

      val givenModel = fillAutoFields(new SelectionModel)
      givenModel.setMarket(new MarketModel)
      givenModel.getMarket.setEvent(new EventModel)
      givenModel.getMarket.getEvent.setSport(givenEvent.sport)

      When("fillNewSelection is executed")
      objectUnderTest.fillNewSelection(givenModel, givenSelection)

      Then("selection price is 0")
      givenModel.getPrice should be("0")
    }
  }

  def fillAutoFields(model: SelectionModel): SelectionModel = {
    model.setId("unRel")
    fillTimestamps(model)

    model
  }
}
