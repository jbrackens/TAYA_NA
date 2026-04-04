package gmx.widget.siteextentions.datafeed.service.sportevents

import java.util.Collections

import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters.mapAsJavaMapConverter
import scala.util.Random

import akka.actor.ActorSystem
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.testkit.TestPublisher
import akka.stream.testkit.TestSubscriber
import akka.stream.testkit.scaladsl.TestSink
import akka.stream.testkit.scaladsl.TestSource
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.scalamock.scalatest.MockFactory
import tech.argyll.video.domain.model.PartnerType

import gmx.common.internal.partner.sbtech.cons.SBTechSelectionType
import gmx.common.internal.partner.sbtech.cons.SBTechSportType
import gmx.dataapi.internal.siteextensions.event.Event
import gmx.dataapi.internal.siteextensions.event.EventTypeEnum
import gmx.dataapi.internal.siteextensions.event.HorseRacingParticipantDetails
import gmx.dataapi.internal.siteextensions.event.MatchParticipantDetails
import gmx.dataapi.internal.siteextensions.event.Participant
import gmx.dataapi.internal.siteextensions.selection.HorseRacingSelectionDetails
import gmx.dataapi.internal.siteextensions.selection.Selection
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.MarketUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogDao
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogService
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.SportEventFlow
import gmx.widget.siteextentions.datafeed.service.sportevents.sink.EventSink
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataRecord
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord
import gmx.widget.siteextentions.datafeed.test.shared.SampleDataRecordFactory.sampleEventUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleDataRecordFactory.sampleMarketUpdate
import gmx.widget.siteextentions.datafeed.test.shared.SampleDataRecordFactory.sampleSelectionUpdate

class SportEventFeedSpec extends ScalaTestWithActorTestKit with BaseSpec with MockFactory {

  "A SportEventFeed" should {

    //TODO (GM-1705): revisit tests
    "convert DataRecords to StateUpdates" ignore {
      withTopologyUsingProbes { (sourceProbe, sinkProbe) =>
        Given("valid Avro messages")
        val givenEvent = sampleEventUpdate(eventId = "123", eventType = EventTypeEnum.Fixture.name())
        val givenMarket = sampleMarketUpdate(marketId = "456")
        val givenSelection =
          sampleSelectionUpdate(selectionId = "789", selectionTypeId = SBTechSelectionType.MoneyLine.sbtechId)

        When("DataRecords pushed to source")
        val mockEventAvroEventRecord = mock[TestAvroEventRecord]
        val mockMarketAvroEventRecord = mock[TestAvroEventRecord]
        val mockSelectionAvroEventRecord = mock[TestAvroEventRecord]
        Seq(
          givenEvent -> mockEventAvroEventRecord,
          givenMarket -> mockMarketAvroEventRecord,
          givenSelection -> mockSelectionAvroEventRecord).foreach(sourceProbe.sendNext(_))

        Then("StateUpdates should be received in sink")
        var update = sinkProbe.requestNext(500.milliseconds)
        update shouldBe an[(EventUpdate, AvroEventRecord)]
        val (eventUpdate, eventAvroEventRecord) = update.asInstanceOf[(EventUpdate, AvroEventRecord)]
        eventUpdate.eventId should be("123")
        eventAvroEventRecord shouldBe mockEventAvroEventRecord

        update = sinkProbe.requestNext(500.milliseconds)
        update shouldBe an[(MarketUpdate, AvroEventRecord)]
        val (marketUpdate, marketAvroEventRecord) = update.asInstanceOf[(MarketUpdate, AvroEventRecord)]
        marketUpdate.marketId should be("456")
        marketAvroEventRecord shouldBe mockMarketAvroEventRecord

        update = sinkProbe.requestNext(500.milliseconds)
        update shouldBe an[(SelectionUpdate, AvroEventRecord)]
        val (selectionUpdate, selectionAvroEventRecord) = update.asInstanceOf[(SelectionUpdate, AvroEventRecord)]
        selectionUpdate.selectionId should be("789")
        selectionAvroEventRecord shouldBe mockSelectionAvroEventRecord

        assertNoMoreMessages(sinkProbe)
      }
    }

    //TODO (GM-1705): revisit tests
    "filter invalid StateUpdates" ignore {
      withTopologyUsingProbes { (sourceProbe, sinkProbe) =>
        Given("invalid Avro messages")
        val eventWithInvalidSport = sampleEventUpdate(sportId = "0")
        val eventWithInvalidType = sampleEventUpdate(eventType = "UNKNOWABLE")
        val eventWithInvalidStatus = sampleEventUpdate(eventStatus = "UNKNOWABLE")
        val eventWithInvalidParticipantVenue = sampleEventUpdate(sportId = SBTechSportType.Soccer.sbtechId)
        eventWithInvalidParticipantVenue.value.getPayload
          .asInstanceOf[Event]
          .setParticipants(
            Collections.singletonList(new Participant("id", "someName", new MatchParticipantDetails("UNKNOWABLE"))))
        val eventWithInvalidParticipantStatus = sampleEventUpdate(sportId = SBTechSportType.HorseRacing.sbtechId)
        eventWithInvalidParticipantStatus.value.getPayload
          .asInstanceOf[Event]
          .setParticipants(
            Collections.singletonList(
              new Participant(
                "id",
                "someName",
                new HorseRacingParticipantDetails("UNKNOWABLE", "2", "3", "mike", "g", "someUrl"))))

        val marketWithInvalidType = sampleMarketUpdate(marketTypeId = "0")

        val selectionWithInvalidType = sampleSelectionUpdate(selectionTypeId = "0")
        val selectionWithInvalidOddsType = sampleSelectionUpdate()
        selectionWithInvalidOddsType.value.getPayload
          .asInstanceOf[Selection]
          .setDisplayOdds(Map("UNKNOWABLE".asInstanceOf[CharSequence] -> "10/1".asInstanceOf[CharSequence]).asJava)
        val selectionWithInvalidRunnerStatus =
          sampleSelectionUpdate(selectionTypeId = SBTechSelectionType.DayOfEvent.sbtechId)
        selectionWithInvalidRunnerStatus.value.getPayload
          .asInstanceOf[Selection]
          .setDetails(new HorseRacingSelectionDetails("UNKNOWABLE"))

        When("DataRecords pushed to source")
        val mockAvroEventRecord = mock[TestAvroEventRecord]
        Seq(
          eventWithInvalidSport,
          eventWithInvalidType,
          eventWithInvalidStatus,
          eventWithInvalidParticipantVenue,
          eventWithInvalidParticipantStatus,
          marketWithInvalidType,
          selectionWithInvalidType,
          selectionWithInvalidOddsType,
          selectionWithInvalidRunnerStatus).foreach(event => sourceProbe.sendNext((event, mockAvroEventRecord)))

        Then("StateUpdates should NOT be received in sink")
        assertNoMoreMessages(sinkProbe)
      }
    }
  }

  def withTopologyUsingProbes(
      test: (
          TestPublisher.Probe[(DataRecord, AvroEventRecord)],
          TestSubscriber.Probe[(StateUpdate, AvroEventRecord)]) => Any): Unit = {
    implicit val classicSystem: ActorSystem = system.classicSystem

    val testEventSource = new EventSource[TestPublisher.Probe[(DataRecord, AvroEventRecord)]] {
      override def provide: Source[(DataRecord, AvroEventRecord), TestPublisher.Probe[(DataRecord, AvroEventRecord)]] =
        TestSource.probe[(DataRecord, AvroEventRecord)]
    }
    val testEventSink = new EventSink[TestSubscriber.Probe[(StateUpdate, AvroEventRecord)]] {
      override def provide: Sink[(StateUpdate, AvroEventRecord), TestSubscriber.Probe[(StateUpdate, AvroEventRecord)]] =
        TestSink.probe[(StateUpdate, AvroEventRecord)]
    }
    val eventsFlow =
      new SportEventFlow(
        PartnerType.SPORT_NATION,
        mock[MessageLogService]
      ) // TODO - do not use mock, but it fails on build with java 8 and caffeine

    val sportEventFeed = new SportEventFeed(testEventSource, eventsFlow, testEventSink)
    val (sourceProbe, sinkProbe) = sportEventFeed.runTopology()
    sinkProbe.ensureSubscription()

    test(sourceProbe, sinkProbe)
  }

  private def assertNoMoreMessages(sinkProbe: TestSubscriber.Probe[(StateUpdate, AvroEventRecord)]) = {
    // need to requestNext to bypass backpressure ;/
    val caught =
      intercept[AssertionError] {
        val update = sinkProbe.requestNext(500.milliseconds)
        update should be(null)
      }
    caught.getMessage should be("Expected OnNext(_), yet no element signaled during 500 milliseconds")
  }
}

class TestAvroEventRecord(partition: Int, offset: Long, key: Array[Byte], value: Array[Byte])
    extends ConsumerRecord[Array[Byte], Array[Byte]](
      "some-non-empty-topic" + Random.nextString(20),
      partition,
      offset,
      key,
      value)
