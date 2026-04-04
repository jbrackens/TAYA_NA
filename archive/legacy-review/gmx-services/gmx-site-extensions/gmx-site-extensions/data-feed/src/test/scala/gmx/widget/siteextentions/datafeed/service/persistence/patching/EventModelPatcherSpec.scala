package gmx.widget.siteextentions.datafeed.service.persistence.patching

import java.time.Instant
import java.time.ZoneOffset

import tech.argyll.video.core.sbtech.SBTechTypeFinder
import tech.argyll.video.core.sbtech.page.NameNormalizer
import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.model.EntityStatus
import tech.argyll.video.domain.model.EventModel
import tech.argyll.video.domain.model.SportType
import tech.argyll.video.domain.test.shared.DomainObjectAssertions.checkAllLevelsStatus
import tech.argyll.video.domain.test.shared.DomainObjectAssertions.checkSoccerEvent
import tech.argyll.video.domain.test.shared.DomainObjectFactory.createSoccerEvent

import gmx.dataapi.internal.siteextensions.event.EventStatusEnum
import gmx.dataapi.internal.siteextensions.event.EventTypeEnum
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.module.PersistenceModule
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerEventUpdate

class EventModelPatcherSpec extends BaseSpec {

  val nameNormalizer = new NameNormalizer
  val typeFinder = new SBTechTypeFinder
  val urlBuilder = new URLBuilder(nameNormalizer, typeFinder)

  val objectUnderTest: EventModelPatcher =
    (new PersistenceModule(MessageToRetryPersistenceConfig.dummy)).eventModelPatcher

  "A EventModelPatcher" should {
    "fill new Event" in {
      Given("Avro message with new Event")
      val givenEvent = sampleSoccerEventUpdate
      val givenModel = fillAutoFields(new EventModel)

      When("fillNewEvent is executed")
      objectUnderTest.fillNewEvent(givenModel, givenEvent)

      Then("all fields are correct")
      checkSoccerEvent(
        givenModel,
        createSoccerEvent(
          givenEvent.header.partner,
          givenEvent.eventId,
          givenEvent.leagueName,
          givenEvent.leagueId.toString,
          givenEvent.startTime.atZone(ZoneOffset.UTC),
          givenEvent.eventName,
          givenEvent.participants(0).name,
          givenEvent.participants(1).name,
          urlBuilder.buildEventURL(givenModel)))
      givenModel.getRefIdOldFormat should be(null)
      checkAllLevelsStatus(givenModel, EntityStatus.ACTIVE)
      givenModel.getMarkets should have size (0)
    }

    "fill existing Event for refId match" in {
      Given("existing Event initialized from update")
      val givenEvent = sampleSoccerEventUpdate
      val givenModel = fillAutoFields(new EventModel)
      objectUnderTest.fillNewEvent(givenModel, givenEvent)

      val givenOldRef = "oldRef"
      givenModel.setRefIdOldFormat(givenOldRef)

      And("followed by update message with meaningful fields changed - for existing")
      val updatedEventWithMeaningfulFields =
        givenEvent.copy(
          eventId = "newID",
          leagueId = -100,
          leagueName = "newLeague",
          startTime = Instant.EPOCH,
          eventName = "newName")

      And("followed by update message with ignored fields changed - for existing")
      val updatedEventWithIgnoredFields =
        updatedEventWithMeaningfulFields.copy(
          sport = SportType.ENHANCED_ODDS,
          countryCode = "ignoredForExistingUpdate",
          eventType = EventTypeEnum.UNKNOWABLE)

      When("fillExistingEvent is executed")
      objectUnderTest.fillExistingEvent(givenModel, updatedEventWithMeaningfulFields)
      objectUnderTest.fillExistingEvent(givenModel, updatedEventWithIgnoredFields)

      Then("ONLY meaningful fields are updated")
      val notChangedURL = urlBuilder.buildEventURL(
        givenEvent.header.partner,
        givenEvent.sport,
        nameNormalizer.normalizeLeague(givenEvent.leagueName),
        givenEvent.startTime.atZone(ZoneOffset.UTC),
        nameNormalizer.normalizeName(givenEvent.eventName))
      checkSoccerEvent(
        givenModel,
        createSoccerEvent(
          givenEvent.header.partner,
          updatedEventWithMeaningfulFields.eventId,
          updatedEventWithMeaningfulFields.leagueName,
          updatedEventWithMeaningfulFields.leagueId.toString,
          updatedEventWithMeaningfulFields.startTime.atZone(ZoneOffset.UTC),
          updatedEventWithMeaningfulFields.eventName,
          givenEvent.participants(0).name,
          givenEvent.participants(1).name,
          notChangedURL))
      givenModel.getRefIdOldFormat should be(givenOldRef)
      checkAllLevelsStatus(givenModel, EntityStatus.ACTIVE)
      givenModel.getMarkets should have size (0)
    }

    "fill existing Event for business key match" in {
      Given("Avro message with update Event")
      val givenEvent = sampleSoccerEventUpdate
      val givenModel = fillAutoFields(new EventModel)
      objectUnderTest.fillNewEvent(givenModel, givenEvent)

      val givenOldRef = "oldRef"
      givenModel.setRefIdOldFormat(givenOldRef)

      And("followed by update message with meaningful fields changed - for businessMatch")
      val updatedEventWithMeaningfulFields =
        givenEvent.copy(eventId = "newId")

      And("followed by update message with ignored fields changed - for businessMatch")
      val updatedEventWithIgnoredFields =
        updatedEventWithMeaningfulFields.copy(
          leagueId = -100,
          leagueName = "newLeague",
          startTime = Instant.EPOCH,
          eventName = "newName")

      When("fillBusinessMatch is executed")
      objectUnderTest.fillBusinessMatch(givenModel, updatedEventWithMeaningfulFields)
      objectUnderTest.fillBusinessMatch(givenModel, updatedEventWithIgnoredFields)

      Then("ONLY meaningful fields are updated")
      val notChangedURL = urlBuilder.buildEventURL(
        givenEvent.header.partner,
        givenEvent.sport,
        nameNormalizer.normalizeLeague(givenEvent.leagueName),
        givenEvent.startTime.atZone(ZoneOffset.UTC),
        nameNormalizer.normalizeName(givenEvent.eventName))
      checkSoccerEvent(
        givenModel,
        createSoccerEvent(
          givenEvent.header.partner,
          updatedEventWithMeaningfulFields.eventId,
          givenEvent.leagueName,
          givenEvent.leagueId.toString,
          givenEvent.startTime.atZone(ZoneOffset.UTC),
          givenEvent.eventName,
          givenEvent.participants(0).name,
          givenEvent.participants(1).name,
          notChangedURL))
      givenModel.getRefIdOldFormat should be(givenOldRef)
      checkAllLevelsStatus(givenModel, EntityStatus.ACTIVE)
      givenModel.getMarkets should have size (0)
    }
  }

  def fillAutoFields(model: EventModel): EventModel = {
    model.setId("unRel")
    fillTimestamps(model)

    model
  }
}
