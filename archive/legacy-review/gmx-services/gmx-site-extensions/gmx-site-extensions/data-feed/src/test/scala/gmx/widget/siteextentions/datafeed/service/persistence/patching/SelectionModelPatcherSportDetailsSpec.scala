package gmx.widget.siteextentions.datafeed.service.persistence.patching

import tech.argyll.video.domain.model._

import gmx.dataapi.internal.siteextensions.selection.SelectionRunnerStatusEnum
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.module.PersistenceModule
import gmx.widget.siteextentions.datafeed.service.Elements.HorseRacingSelectionDetailsUpdate
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleMarketUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerEventUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerSelectionUpdate

class SelectionModelPatcherSportDetailsSpec extends BaseSpec {

  val objectUnderTest: SelectionModelPatcher =
    (new PersistenceModule(MessageToRetryPersistenceConfig.dummy)).selectionModelPatcher

  "A SelectionModelPatcher" should {
    "fill new HorseRacing Selection details" in {
      Given("Avro message with new HorseRacing Selection")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenSelection = sampleSoccerSelectionUpdate(givenMarket).copy(details =
        HorseRacingSelectionDetailsUpdate(SelectionRunnerStatusEnum.DOE))

      val givenModel = fillAutoFields(new SelectionModel)
      givenModel.setMarket(new MarketModel)
      givenModel.getMarket.setEvent(new EventModel)
      givenModel.getMarket.getEvent.setSport(givenEvent.sport)

      When("fillNewSelection is executed")
      objectUnderTest.fillNewSelection(givenModel, givenSelection)

      Then("all fields are initialized and empty")
      givenModel.getDetails shouldBe a[HorseRacingSelectionDetails]
      val actualDetails = givenModel.getDetails.asInstanceOf[HorseRacingSelectionDetails]
      actualDetails.getHorseId should be(null)
      actualDetails.getJockey should be(null)
      actualDetails.getNumber should be(null)
      actualDetails.getShirt should be(null)
      actualDetails.getStall should be(null)
      actualDetails.getTrainer should be(null)
    }

    "fill existing HorseRacing Selection details" in {
      Given("existing HorseRacing Selection initialized from update")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenSelection = sampleSoccerSelectionUpdate(givenMarket).copy(details =
        HorseRacingSelectionDetailsUpdate(SelectionRunnerStatusEnum.SP))

      val givenModel = fillAutoFields(new SelectionModel)
      givenModel.setMarket(new MarketModel)
      givenModel.getMarket.setEvent(new EventModel)
      givenModel.getMarket.getEvent.setSport(givenEvent.sport)
      objectUnderTest.fillNewSelection(givenModel, givenSelection)

      And("details updated externally (eg from PA feed)")
      val oldDetails = new HorseRacingSelectionDetails()
      oldDetails.setHorseId(123)
      oldDetails.setJockey("john m")
      oldDetails.setNumber(4)
      oldDetails.setShirt("silkUrl")
      oldDetails.setStall(1)
      oldDetails.setTrainer("andy t")
      givenModel.updateDetails(oldDetails)

      And("followed by update message with details changed")
      val updatedSelectionWithDetailsChanged = sampleSoccerSelectionUpdate(givenMarket).copy(details =
        HorseRacingSelectionDetailsUpdate(SelectionRunnerStatusEnum.NR))

      And("fillExistingEvent is executed")
      objectUnderTest.fillExistingSelection(givenModel, updatedSelectionWithDetailsChanged)

      Then("teams should be set and url is not changed")
      givenModel.getDetails shouldBe a[HorseRacingSelectionDetails]
      val actualDetails = givenModel.getDetails.asInstanceOf[HorseRacingSelectionDetails]
      actualDetails.getHorseId should be(oldDetails.getHorseId)
      actualDetails.getJockey should be(oldDetails.getJockey)
      actualDetails.getNumber should be(oldDetails.getNumber)
      actualDetails.getShirt should be(oldDetails.getShirt)
      actualDetails.getStall should be(oldDetails.getStall)
      actualDetails.getTrainer should be(oldDetails.getTrainer)
    }
  }

  def fillAutoFields(model: SelectionModel): SelectionModel = {
    model.setId("unRel")
    fillTimestamps(model)

    model
  }
}
