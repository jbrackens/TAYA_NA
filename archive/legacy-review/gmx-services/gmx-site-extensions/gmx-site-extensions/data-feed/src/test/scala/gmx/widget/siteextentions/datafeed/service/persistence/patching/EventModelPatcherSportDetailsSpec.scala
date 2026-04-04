package gmx.widget.siteextentions.datafeed.service.persistence.patching

import tech.argyll.video.core.sbtech.SBTechTypeFinder
import tech.argyll.video.core.sbtech.page.NameNormalizer
import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.model.EventModel
import tech.argyll.video.domain.model.HorseRacingEventDetails
import tech.argyll.video.domain.model.SoccerEventDetails
import tech.argyll.video.domain.model.SportType

import gmx.dataapi.internal.siteextensions.event.ParticipantVenueRoleEnum
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.module.PersistenceModule
import gmx.widget.siteextentions.datafeed.service.Elements.MatchParticipantDetailsUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.ParticipantUpdate
import gmx.widget.siteextentions.datafeed.service.ElementsOps._
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerEventUpdate

class EventModelPatcherSportDetailsSpec extends BaseSpec {

  val nameNormalizer = new NameNormalizer
  val typeFinder = new SBTechTypeFinder
  val urlBuilder = new URLBuilder(nameNormalizer, typeFinder)

  val objectUnderTest: EventModelPatcher =
    (new PersistenceModule(MessageToRetryPersistenceConfig.dummy)).eventModelPatcher

  "A EventModelPatcher" should {
    "fill new EnhancedOdds Event details" in {
      Given("Avro message with new EnhancedOdds Event")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.ENHANCED_ODDS)
      val givenModel = fillAutoFields(new EventModel)
      givenModel.setSport(SportType.ENHANCED_ODDS)

      When("fillNewEvent is executed")
      objectUnderTest.fillNewEvent(givenModel, givenEvent)

      Then("details are NULL")
      givenModel.getDetails should be(null)
    }

    "fill existing EnhancedOdds Event details" in {
      Given("existing EnhancedOdds Event initialized from update")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.ENHANCED_ODDS)
      val givenModel = fillAutoFields(new EventModel)
      givenModel.setSport(SportType.ENHANCED_ODDS)
      objectUnderTest.fillNewEvent(givenModel, givenEvent)

      And("followed by update message with details changed")
      val updatedEventWithDetailsChanged = sampleSoccerEventUpdate.copy(sport = SportType.ENHANCED_ODDS)

      And("fillExistingEvent is executed")
      objectUnderTest.fillExistingEvent(givenModel, updatedEventWithDetailsChanged)

      Then("details are NULL")
      givenModel.getDetails should be(null)
    }

    "fill new Soccer/Football Event details" in {
      Given("Avro message with new Soccer Event")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.SOCCER)
      val givenModel = fillAutoFields(new EventModel)
      givenModel.setSport(SportType.SOCCER)

      When("fillNewEvent is executed")
      objectUnderTest.fillNewEvent(givenModel, givenEvent)

      Then("teams should be set and url generated")
      givenModel.getDetails shouldBe a[SoccerEventDetails]
      val actualDetails = givenModel.getDetails.asInstanceOf[SoccerEventDetails]
      actualDetails.getHomeTeam should be(givenEvent.findParticipant(ParticipantVenueRoleEnum.Home).get.name)
      actualDetails.getAwayTeam should be(givenEvent.findParticipant(ParticipantVenueRoleEnum.Away).get.name)
      actualDetails.getEventUrl should be(urlBuilder.buildEventURL(givenModel))
    }

    "fill existing Soccer/Football Event details" in {
      Given("existing Soccer Event initialized from update")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.SOCCER)
      val givenModel = fillAutoFields(new EventModel)
      givenModel.setSport(SportType.SOCCER)
      objectUnderTest.fillNewEvent(givenModel, givenEvent)
      val oldUrl = givenModel.getDetails.asInstanceOf[SoccerEventDetails].getEventUrl

      And("followed by update message with details changed")
      val updatedEventWithDetailsChanged = sampleSoccerEventUpdate.copy(
        sport = SportType.SOCCER,
        participants = Seq(
          ParticipantUpdate("id1", "partA", MatchParticipantDetailsUpdate(ParticipantVenueRoleEnum.Home)),
          ParticipantUpdate("id2", "partB", MatchParticipantDetailsUpdate(ParticipantVenueRoleEnum.Away))))

      And("fillExistingEvent is executed")
      objectUnderTest.fillExistingEvent(givenModel, updatedEventWithDetailsChanged)

      Then("teams should be set and url is not changed")
      givenModel.getDetails shouldBe a[SoccerEventDetails]
      val actualDetails = givenModel.getDetails.asInstanceOf[SoccerEventDetails]
      actualDetails.getHomeTeam should be(
        updatedEventWithDetailsChanged.findParticipant(ParticipantVenueRoleEnum.Home).get.name)
      actualDetails.getAwayTeam should be(
        updatedEventWithDetailsChanged.findParticipant(ParticipantVenueRoleEnum.Away).get.name)
      actualDetails.getEventUrl should be(oldUrl)
    }

    "fill new HorseRacing Event details" in {
      Given("Avro message with new HorseRacing Event")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)
      val givenModel = fillAutoFields(new EventModel)
      givenModel.setSport(SportType.HORSE_RACING)

      When("fillNewEvent is executed")
      objectUnderTest.fillNewEvent(givenModel, givenEvent)

      Then("url should be generated")
      givenModel.getDetails shouldBe a[HorseRacingEventDetails]
      val actualDetails = givenModel.getDetails.asInstanceOf[HorseRacingEventDetails]
      actualDetails.getEventUrl should be(urlBuilder.buildEventURL(givenModel))
    }

    "fill HorseRacing Event details" in {
      Given("existing HorseRacing Event initialized from update")
      val givenEvent = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)
      val givenModel = fillAutoFields(new EventModel)
      givenModel.setSport(SportType.HORSE_RACING)
      objectUnderTest.fillNewEvent(givenModel, givenEvent)
      val oldUrl = givenModel.getDetails.asInstanceOf[HorseRacingEventDetails].getEventUrl

      And("followed by update message with details changed")
      val updatedEventWithDetailsChanged = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)

      And("fillExistingEvent is executed")
      objectUnderTest.fillExistingEvent(givenModel, updatedEventWithDetailsChanged)

      Then("url should not change")
      givenModel.getDetails shouldBe a[HorseRacingEventDetails]
      val actualDetails = givenModel.getDetails.asInstanceOf[HorseRacingEventDetails]
      actualDetails.getEventUrl should be(oldUrl)
    }
  }

  def fillAutoFields(model: EventModel): EventModel = {
    model.setId("unRel")
    fillTimestamps(model)

    model
  }
}
