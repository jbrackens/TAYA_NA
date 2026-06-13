package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.data.v1.EventsDataProvider
import net.flipsports.gmx.streaming.sbtech.dto.{Id, Kind, Odds}
import net.flipsports.gmx.streaming.sbtech.{SportEventsTypes, asString}
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class EventsToEventSpec extends StreamingTestBase {


  "EventsToEvent mapper" should {

    "map events" in {
      // given
      val source = EventsDataProvider.single

      // when
      val result = new SportEventEventsUpdateMapper().map(Odds(Id("64152060"),Kind.Event, DateFormats.nowEpochInMiliAtUtc(), event = Some(source.f1)))

      // then

      val payload = result.f1.getPayload.asInstanceOf[SportEventsTypes.SportEventEvent.ValueType]

      asString(result.f0.getId) should be("64152060")
      asString(payload.getEventName) should be("Antiques Vintage & Collectables Fair 25 Aug Handicap")
      asString(payload.getLeagueName) should be("Brighton")
      asString(payload.getStatus) should be("NotStarted")
      payload.getParticipants.size() should be(5)

      val participant = payload.getParticipants.get(0)
      asString(participant.getId) should be("533593")
      asString(participant.getName) should be("Pink Iceburg (T P Queally)")

    }
  }

}
