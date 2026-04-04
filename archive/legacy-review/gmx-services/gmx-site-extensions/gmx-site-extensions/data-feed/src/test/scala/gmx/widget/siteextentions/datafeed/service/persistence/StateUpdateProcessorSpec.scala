package gmx.widget.siteextentions.datafeed.service.persistence

import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime

import org.mockito.Matchers.any
import org.mockito.Matchers.same
import org.mockito.Mockito
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import tech.argyll.video.core.sbtech.SBTechTypeFinder
import tech.argyll.video.core.sbtech.page.NameNormalizer
import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.EventDao
import tech.argyll.video.domain.MarketDao
import tech.argyll.video.domain.SelectionDao
import tech.argyll.video.domain.model.EntityStatus
import tech.argyll.video.domain.model._
import tech.argyll.video.domain.test.shared.DomainObjectAssertions._
import tech.argyll.video.domain.test.shared.DomainObjectDbUtils.purgeDb
import tech.argyll.video.domain.test.shared.DomainObjectUtils.findMarket
import tech.argyll.video.domain.test.shared.DomainObjectUtils.findSelection
import tech.argyll.video.domain.test.shared.SampleObjectGenerator.createSampleEvent
import tech.argyll.video.domain.test.shared.SampleObjectGenerator.createSampleMarket
import tech.argyll.video.domain.test.shared.SampleObjectGenerator.createSampleSelection

import gmx.dataapi.internal.siteextensions.event.EventStatusEnum
import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.module.PersistenceModule
import gmx.widget.siteextentions.datafeed.service.Elements.DeleteHeader
import gmx.widget.siteextentions.datafeed.service.Elements.EventDelete
import gmx.widget.siteextentions.datafeed.service.Elements.MarketDelete
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionDelete
import gmx.widget.siteextentions.datafeed.service.Elements._
import gmx.widget.siteextentions.datafeed.service.persistence.patching.EventModelPatcher
import gmx.widget.siteextentions.datafeed.service.persistence.patching.MarketModelPatcher
import gmx.widget.siteextentions.datafeed.service.persistence.patching.SelectionModelPatcher
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleMarketUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerEventUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleStateUpdateFactory.sampleSoccerSelectionUpdate

class StateUpdateProcessorSpec extends BaseSpec {

  val nameNormalizer = new NameNormalizer
  val typeFinder = new SBTechTypeFinder
  val urlBuilder = new URLBuilder(nameNormalizer, typeFinder)

  val eventDao = new EventDao
  val marketDao = new MarketDao
  val selectionDao = new SelectionDao

  // inject Spies for Patchers that are tested separately in `gmx.widget.siteextentions.datafeed.service.persistence.patching`
  val persistenceModule = new PersistenceModule(MessageToRetryPersistenceConfig.dummy)
  val eventModelPatcherSpy: EventModelPatcher = Mockito.spy(persistenceModule.eventModelPatcher)
  val marketModelPatcherSpy: MarketModelPatcher = Mockito.spy(persistenceModule.marketModelPatcher)
  val selectionModelPatcherSpy: SelectionModelPatcher = Mockito.spy(persistenceModule.selectionModelPatcher)

  val objectUnderTest: StateUpdateProcessor = new PersistenceModule(MessageToRetryPersistenceConfig.dummy) {
    override lazy val eventModelPatcher: EventModelPatcher = eventModelPatcherSpy
    override lazy val marketModelPatcher: MarketModelPatcher = marketModelPatcherSpy
    override lazy val selectionModelPatcher: SelectionModelPatcher = selectionModelPatcherSpy
  }.stateUpdateProcessor

  "A StateUpdateProcessor" should {
    "create event, market and selection in DB" in
    withCleanState {
      Given("Avro message sequence with ONE new element for: Event, Market, Selection")
      val givenEvent = sampleSoccerEventUpdate
      val givenMarket = sampleMarketUpdate(givenEvent)
      val givenSelection = sampleSoccerSelectionUpdate(givenMarket)

      checkDBCount(0, 0, 0)

      When("persist is executed")
      Seq(givenEvent, givenMarket, givenSelection).foreach(objectUnderTest.persist)

      Then("records count in DB matches")
      checkDBCount(1, 1, 1)

      And("Entities are ACTIVE")
      checkStatus(eventDao.findByRefIdAndPartner(givenEvent.eventId, givenEvent.header.partner), EntityStatus.ACTIVE)

      checkStatus(
        marketDao.findByRefIdAndPartner(givenMarket.marketId, givenMarket.header.partner),
        EntityStatus.ACTIVE)

      checkStatus(
        selectionDao.findByRefIdAndPartner(givenSelection.selectionId, givenSelection.header.partner),
        EntityStatus.ACTIVE)

      And("all patchers were correctly executed")
      verify(eventModelPatcherSpy).fillNewEvent(any[EventModel](), same(givenEvent))
      verifyNoMoreInteractions(eventModelPatcherSpy)

      verify(marketModelPatcherSpy).fillNewMarket(any[MarketModel](), same(givenMarket))
      verifyNoMoreInteractions(marketModelPatcherSpy)

      verify(selectionModelPatcherSpy).fillNewSelection(any[SelectionModel](), same(givenSelection))
      verifyNoMoreInteractions(selectionModelPatcherSpy)
    }

    "correctly attach markets and selections" in {
      withCleanState {
        Given("Avro message sequence with MULTIPLE new elements for: Event, Market, Selection")
        val givenEvent1 = sampleSoccerEventUpdate
        val givenMarket11 = sampleMarketUpdate(givenEvent1)
        val givenSelection111 = sampleSoccerSelectionUpdate(givenMarket11)
        val givenSelection112 = sampleSoccerSelectionUpdate(givenMarket11)
        val givenMarket12 = sampleMarketUpdate(givenEvent1)
        val givenSelection121 = sampleSoccerSelectionUpdate(givenMarket12)
        val givenSelection122 = sampleSoccerSelectionUpdate(givenMarket12)

        val givenEvent2 = sampleSoccerEventUpdate
        val givenMarket21 = sampleMarketUpdate(givenEvent2)
        val givenSelection211 = sampleSoccerSelectionUpdate(givenMarket21)

        checkDBCount(0, 0, 0)

        When("persist is executed")
        Seq(
          givenEvent1,
          givenMarket11,
          givenSelection111,
          givenSelection112,
          givenMarket12,
          givenSelection121,
          givenSelection122,
          givenEvent2,
          givenMarket21,
          givenSelection211).foreach(objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(2, 3, 5)

        And("all patchers were correctly executed")
        verify(eventModelPatcherSpy, times(2)).fillNewEvent(any[EventModel](), any[EventUpdate]())
        verifyNoMoreInteractions(eventModelPatcherSpy)

        verify(marketModelPatcherSpy, times(3)).fillNewMarket(any[MarketModel](), any[MarketUpdate]())
        verifyNoMoreInteractions(marketModelPatcherSpy)

        verify(selectionModelPatcherSpy, times(5)).fillNewSelection(any[SelectionModel](), any[SelectionUpdate]())
        verifyNoMoreInteractions(selectionModelPatcherSpy)

        And("elements are attached correctly")
        val actualEvents1 = eventDao.findByMeid(givenEvent1.header.partner, givenEvent1.eventId)
        actualEvents1.getMarkets should have size (2)
        val actualMarket11 = findMarket(actualEvents1, givenMarket11.marketId)
        actualMarket11.getSelections should have size (2)
        findSelection(actualMarket11, givenSelection111.selectionId)
        findSelection(actualMarket11, givenSelection112.selectionId)
        val actualMarket12 = findMarket(actualEvents1, givenMarket12.marketId)
        actualMarket12.getSelections should have size (2)
        findSelection(actualMarket12, givenSelection121.selectionId)
        findSelection(actualMarket12, givenSelection122.selectionId)

        val actualEvents2 = eventDao.findByMeid(givenEvent2.header.partner, givenEvent2.eventId)
        actualEvents2.getMarkets should have size (1)
        val actualMarket21 = findMarket(actualEvents2, givenMarket21.marketId)
        actualMarket21.getSelections should have size (1)
        findSelection(actualMarket21, givenSelection211.selectionId)
      }
    }

    "update event, market and selection in DB" in {
      withCleanState {
        Given("Avro message sequence with ONE new element for: Event, Market, Selection")
        val givenEvent = sampleSoccerEventUpdate
        val givenMarket = sampleMarketUpdate(givenEvent)
        val givenSelection = sampleSoccerSelectionUpdate(givenMarket)

        And("followed by sequence with ONE update element for: Event, Market, Selection - matching refId")
        val updatedEventMatchingRefId =
          givenEvent.copy(
            leagueId = -100,
            leagueName = "leagueChange1",
            startTime = Instant.EPOCH,
            eventName = "nameChange1")
        val updatedMarketMatchingRefId = givenMarket.copy()
        val updatedSelectionMatchingRefId =
          givenSelection.copy(displayOdds = Map(SelectionOddsTypeEnum.Fractional -> "100/1"))

        checkDBCount(0, 0, 0)

        When("persist is executed")
        Seq(
          givenEvent,
          givenMarket,
          givenSelection,
          updatedEventMatchingRefId,
          updatedMarketMatchingRefId,
          updatedSelectionMatchingRefId).foreach(objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(1, 1, 1)

        And("Entities are ACTIVE")
        checkStatus(eventDao.findByRefIdAndPartner(givenEvent.eventId, givenEvent.header.partner), EntityStatus.ACTIVE)

        checkStatus(
          marketDao.findByRefIdAndPartner(givenMarket.marketId, givenMarket.header.partner),
          EntityStatus.ACTIVE)

        checkStatus(
          selectionDao.findByRefIdAndPartner(givenSelection.selectionId, givenSelection.header.partner),
          EntityStatus.ACTIVE)

        And("all patchers were correctly executed")
        verify(eventModelPatcherSpy).fillNewEvent(any[EventModel](), same(givenEvent))
        verify(eventModelPatcherSpy).fillExistingEvent(any[EventModel](), same(updatedEventMatchingRefId))
        verifyNoMoreInteractions(eventModelPatcherSpy)

        verify(marketModelPatcherSpy).fillNewMarket(any[MarketModel](), same(givenMarket))
        verify(marketModelPatcherSpy).fillExistingMarket(any[MarketModel](), same(updatedMarketMatchingRefId))
        verifyNoMoreInteractions(marketModelPatcherSpy)

        verify(selectionModelPatcherSpy).fillNewSelection(any[SelectionModel](), same(givenSelection))
        verify(selectionModelPatcherSpy)
          .fillExistingSelection(any[SelectionModel](), same(updatedSelectionMatchingRefId))
        verifyNoMoreInteractions(selectionModelPatcherSpy)
      }
    }

    "perform business migration on Event" in {
      withCleanState {
        Given("two Events in DB from XML feed with some refId")
        val givenEventModel1 = createSampleEvent()
        givenEventModel1.setDetails(null)
        givenEventModel1.setStartTime(ZonedDateTime.now())
        givenEventModel1.setRefIdOldFormat(null)
        givenEventModel1.setRefId(givenEventModel1.getRefIdOldFormat)
        givenEventModel1.save()

        val givenEventModel2 = createSampleEvent()
        givenEventModel2.setDetails(null)
        givenEventModel2.setStartTime(ZonedDateTime.now().plusDays(1))
        givenEventModel2.setRefIdOldFormat("event2Ref")
        givenEventModel2.setRefId(givenEventModel2.getRefIdOldFormat)
        givenEventModel2.save()

        checkDBCount(2, 0, 0)

        And("followed by ONE update element for: Event1 - without matching refId, but business key match")
        var givenEventUpdate1 = sampleSoccerEventUpdate
        givenEventUpdate1 = givenEventUpdate1.copy(
          eventId = "differentId",
          header = givenEventUpdate1.header.copy(partner = givenEventModel1.getPartner),
          sport = givenEventModel1.getSport,
          leagueName = givenEventModel1.getLeague,
          startTime = givenEventModel1.getStartTime.toInstant,
          eventName = givenEventModel1.getName)

        And("followed by ONE update element for: Event - without matching refId, and without business key match")
        var givenEventUpdate2 = sampleSoccerEventUpdate
        givenEventUpdate2 = givenEventUpdate2.copy(
          eventId = "andAnotherDifferentId",
          eventName = "differentName",
          header = givenEventUpdate2.header.copy(partner = givenEventModel1.getPartner))

        When("persist is executed")
        Seq(givenEventUpdate1, givenEventUpdate2).foreach(objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(3, 0, 0)

        And("all patchers were correctly executed")
        verify(eventModelPatcherSpy).fillBusinessMatch(any[EventModel](), same(givenEventUpdate1))
        verify(eventModelPatcherSpy).fillNewEvent(any[EventModel](), same(givenEventUpdate2))
        verifyNoMoreInteractions(eventModelPatcherSpy)
      }
    }

    "perform business migration on Market" in {
      withCleanState {
        Given("Market in DB from XML feed with some refId")
        val givenEventModel = createSampleEvent()
        val givenMarketModel = createSampleMarket()
        givenMarketModel.setRefIdOldFormat("1234123")
        givenMarketModel.setRefId(givenMarketModel.getRefIdOldFormat)

        givenEventModel.addMarket(givenMarketModel)
        givenEventModel.save()
        givenMarketModel.save()

        checkDBCount(1, 1, 0)

        And("followed by ONE update element for: Market - without matching refId, but business key match")
        val givenEventUpdate = sampleSoccerEventUpdate.copy(eventId = givenEventModel.getRefId)
        var givenMarketUpdate1 = sampleMarketUpdate(givenEventUpdate)
        givenMarketUpdate1 = givenMarketUpdate1.copy(
          marketId = "2_1234123",
          header = givenMarketUpdate1.header.copy(partner = givenEventModel.getPartner),
          marketType = givenMarketModel.getType)

        And("followed by ONE update element for: Market - without matching refId and refIdOld")
        var givenMarketUpdate2 = sampleMarketUpdate(givenEventUpdate).copy(eventId = givenEventModel.getRefId)
        givenMarketUpdate2 = givenMarketUpdate2.copy(
          marketId = "777",
          header = givenMarketUpdate2.header.copy(partner = givenEventModel.getPartner),
          marketType = givenMarketModel.getType)

        When("persist is executed")
        Seq(givenMarketUpdate1, givenMarketUpdate2).foreach(objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(1, 2, 0)

        And("all patchers were correctly executed")
        verify(marketModelPatcherSpy).fillExistingMarket(any[MarketModel](), same(givenMarketUpdate1))
        verify(marketModelPatcherSpy).fillNewMarket(any[MarketModel](), same(givenMarketUpdate2))
        verifyNoMoreInteractions(marketModelPatcherSpy)
      }
    }

    "perform business migration on Selection" in {
      withCleanState {
        Given("two Selections in DB from XML feed with some refId (old QA and line format)")
        val givenEventModel = createSampleEvent()
        val givenMarketModel = createSampleMarket()
        val givenSelectionModel1 = createSampleSelection()
        givenSelectionModel1.setDetails(null)
        givenSelectionModel1.setRefIdOldFormat("Q974647389_40817")
        givenSelectionModel1.setRefId(givenSelectionModel1.getRefIdOldFormat)
        val givenSelectionModel2 = createSampleSelection()
        givenSelectionModel2.setDetails(null)
        givenSelectionModel2.setRefIdOldFormat("R753706662")
        givenSelectionModel2.setRefId(givenSelectionModel2.getRefIdOldFormat)

        givenEventModel.addMarket(givenMarketModel)
        givenMarketModel.addSelection(givenSelectionModel1)
        givenMarketModel.addSelection(givenSelectionModel2)
        givenEventModel.save()
        givenMarketModel.save()
        givenSelectionModel1.save()
        givenSelectionModel2.save()

        checkDBCount(1, 1, 2)

        And("followed by ONE update element for: Selection - without matching refId, but business key match QA")
        val givenEventUpdate = sampleSoccerEventUpdate.copy(eventId = givenEventModel.getRefId)
        val givenMarketUpdate = sampleMarketUpdate(givenEventUpdate).copy(marketId = givenMarketModel.getRefId)
        var givenSelectionUpdate1 = sampleSoccerSelectionUpdate(givenMarketUpdate)
        givenSelectionUpdate1 = givenSelectionUpdate1.copy(
          selectionId = "0QA83295002#974647389_13L40817Q11714Q20",
          header = givenSelectionUpdate1.header.copy(partner = givenEventModel.getPartner))

        And("followed by ONE update element for: Selection - without matching refId, but business key match notQA")
        var givenSelectionUpdate2 = sampleSoccerSelectionUpdate(givenMarketUpdate)
        givenSelectionUpdate2 = givenSelectionUpdate2.copy(
          selectionId = "0ML52836842_1",
          selectionIntId = 753706662,
          header = givenSelectionUpdate2.header.copy(partner = givenEventModel.getPartner))

        And("followed by ONE update element for: Selection - without matching refId, and without business key match")
        var givenSelectionUpdate3 = sampleSoccerSelectionUpdate(givenMarketUpdate)
        givenSelectionUpdate3 = givenSelectionUpdate3.copy(
          selectionId = "differentId",
          selectionIntId = -1,
          header = givenSelectionUpdate3.header.copy(partner = givenEventModel.getPartner))

        When("persist is executed")
        Seq(givenSelectionUpdate1, givenSelectionUpdate2, givenSelectionUpdate3).foreach(objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(1, 1, 3)

        And("all patchers were correctly executed")
        verify(selectionModelPatcherSpy).fillExistingSelection(any[SelectionModel](), same(givenSelectionUpdate1))
        verify(selectionModelPatcherSpy).fillExistingSelection(any[SelectionModel](), same(givenSelectionUpdate2))
        verify(selectionModelPatcherSpy).fillNewSelection(any[SelectionModel](), same(givenSelectionUpdate3))
        verifyNoMoreInteractions(selectionModelPatcherSpy)
      }
    }

    "disable event for all scenarios" in {
      withCleanState {
        Given("Avro message sequence for 5 different Events")
        val givenEvent1 = sampleSoccerEventUpdate
        val givenEvent2 = sampleSoccerEventUpdate
        val givenEvent3 = sampleSoccerEventUpdate
        val givenEvent4 = sampleSoccerEventUpdate
        val givenEvent5 = sampleSoccerEventUpdate
        val givenEvent6 = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)
        val givenEvent7 = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)
        val givenEvent8 = sampleSoccerEventUpdate.copy(sport = SportType.HORSE_RACING)

        And("followed by Delete message for 2nd Event")
        val nullUpdate = EventDelete(DeleteHeader(givenEvent2.header.partner), givenEvent2.eventId)
        And("followed by isDisable update for 3rd Event")
        val disableUpdate = givenEvent3.copy(isDisabled = true)
        And("followed by isLive update for 4th Event")
        val liveUpdate = givenEvent4.copy(isLive = true)
        And("followed by status different than NotStarted for 5th Event")
        val statusUpdate = givenEvent5.copy(status = EventStatusEnum.Resulted)
        And("followed by status different than Resulted for 7th Event")
        val statusUpdateHRRaceOff = givenEvent7.copy(status = EventStatusEnum.RaceOff)
        And("followed by status different than Resulted for 8th Event")
        val statusUpdateHResulted = givenEvent8.copy(status = EventStatusEnum.Resulted)

        When("persist is executed")
        Seq(
          givenEvent1,
          givenEvent2,
          givenEvent3,
          givenEvent4,
          givenEvent5,
          givenEvent6,
          givenEvent7,
          givenEvent8,
          nullUpdate,
          disableUpdate,
          liveUpdate,
          statusUpdate,
          statusUpdateHRRaceOff,
          statusUpdateHResulted).foreach(objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(8, 0, 0)

        And("1,6,7 is ACTIVE; 2,3,4,5,8 Events are DELETED")
        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent1.eventId, givenEvent1.header.partner),
          EntityStatus.ACTIVE)

        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent2.eventId, givenEvent2.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent3.eventId, givenEvent3.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent4.eventId, givenEvent4.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent5.eventId, givenEvent5.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent6.eventId, givenEvent6.header.partner),
          EntityStatus.ACTIVE)

        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent7.eventId, givenEvent7.header.partner),
          EntityStatus.ACTIVE)

        checkStatus(
          eventDao.findByRefIdAndPartner(givenEvent8.eventId, givenEvent8.header.partner),
          EntityStatus.DELETED)
      }
    }

    "disable market for all scenarios" in {
      withCleanState {
        Given("Avro message sequence for 3 different Markets")
        val givenEvent = sampleSoccerEventUpdate
        val givenMarket1 = sampleMarketUpdate(givenEvent)
        val givenMarket2 = sampleMarketUpdate(givenEvent)
        val givenMarket3 = sampleMarketUpdate(givenEvent)

        And("followed by Delete message for 1st Market")
        val nullUpdate = MarketDelete(DeleteHeader(givenMarket1.header.partner), givenMarket1.marketId)
        And("followed by isDisable update for 2nd Market")
        val disableUpdate = givenMarket2.copy(isDisabled = true)

        When("persist is executed")
        Seq(givenEvent, givenMarket1, givenMarket2, givenMarket3, nullUpdate, disableUpdate).foreach(
          objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(1, 3, 0)

        And("Event is ACTIVE")
        checkStatus(eventDao.findByRefIdAndPartner(givenEvent.eventId, givenEvent.header.partner), EntityStatus.ACTIVE)

        And("1,2 Markets are DELETED; 3 is ACTIVE")
        checkStatus(
          marketDao.findByRefIdAndPartner(givenMarket1.marketId, givenMarket1.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          marketDao.findByRefIdAndPartner(givenMarket2.marketId, givenMarket2.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          marketDao.findByRefIdAndPartner(givenMarket3.marketId, givenMarket3.header.partner),
          EntityStatus.ACTIVE)
      }
    }

    "disable selection for all scenarios" in {
      withCleanState {
        Given("Avro message sequence for 3 different Selections")
        val givenEvent = sampleSoccerEventUpdate
        val givenMarket = sampleMarketUpdate(givenEvent)
        val givenSelection1 = sampleSoccerSelectionUpdate(givenMarket)
        val givenSelection2 = sampleSoccerSelectionUpdate(givenMarket)
        val givenSelection3 = sampleSoccerSelectionUpdate(givenMarket)

        And("followed by Delete message for 1st Selection")
        val nullUpdate = SelectionDelete(DeleteHeader(givenSelection1.header.partner), givenSelection1.selectionId)
        And("followed by isDisable update for 2nd Selection")
        val disableUpdate = givenSelection2.copy(isDisabled = true)

        When("persist is executed")
        Seq(givenEvent, givenMarket, givenSelection1, givenSelection2, givenSelection3, nullUpdate, disableUpdate)
          .foreach(objectUnderTest.persist)

        Then("records count in DB matches")
        checkDBCount(1, 1, 3)

        And("Event is enabled")
        checkStatus(eventDao.findByRefIdAndPartner(givenEvent.eventId, givenEvent.header.partner), EntityStatus.ACTIVE)

        And("Market is enabled")
        checkStatus(
          marketDao.findByRefIdAndPartner(givenMarket.marketId, givenMarket.header.partner),
          EntityStatus.ACTIVE)

        And("1,2 Selections are DELETED; 3 is ACTIVE")
        checkStatus(
          selectionDao.findByRefIdAndPartner(givenSelection1.selectionId, givenSelection1.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          selectionDao.findByRefIdAndPartner(givenSelection2.selectionId, givenSelection2.header.partner),
          EntityStatus.DELETED)

        checkStatus(
          selectionDao.findByRefIdAndPartner(givenSelection3.selectionId, givenSelection3.header.partner),
          EntityStatus.ACTIVE)
      }
    }
  }

  def withCleanState(test: => Any): Unit = {
    purgeDb()
    Mockito.reset(eventModelPatcherSpy, marketModelPatcherSpy, selectionModelPatcherSpy)
    test
  }

  def checkDBCount(expectedEvents: Int, expectedMarkets: Int, expectedSelections: Int): Unit = {
    EventDao.find.all should have size (expectedEvents)
    MarketDao.find.all should have size (expectedMarkets)
    SelectionDao.find.all should have size (expectedSelections)
  }
}
