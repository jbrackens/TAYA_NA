package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.validator

import akka.actor.ActorSystem
import akka.event.{Logging, LoggingAdapter}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.{EventsUpdate, ParticipantUpdate}
import org.junit.runner.RunWith
import org.scalatest.concurrent.Futures
import org.scalatest.junit.JUnitRunner
import org.scalatest.{FunSuite, Matchers}

@RunWith(classOf[JUnitRunner])
class EventUpdateValidatorSpec extends FunSuite with Futures with Matchers {

  private val system = ActorSystem("PlaceBetsHandlerSpec")
  private implicit val loggingAdapter: LoggingAdapter = Logging(system, this.getClass)

  lazy val objectUnderTest = new EventUpdateValidator {}

  test("'addEventSource()' SHOULD connect Source to Stream") {
    // given
    val givenMsg = EventsUpdate("3874324b-5391-49d4-a988-37be27d95f2c", "74309920", "DayOfEventRace", "Race 5", "Bro Park", 1589371440, "NotStarted", Seq(
      ParticipantUpdate("960bad9d-7abe-43ba-a578-6ef203dc4bcf", "882224", "Cheeta", "", "Ante-post"),
      ParticipantUpdate("dd6a7c33-c8a3-478f-98e2-32fbea49acad", "882223", "Bear Beata", "", "Ante-post"),
      ParticipantUpdate("a1b2091c-d26d-49a0-86a9-2b61c0da441a", "849980", "Malindi", "", "Ante-post"),
      ParticipantUpdate("f9e0d0d0-fdfc-4cec-b458-eef78bf9c311", "849895", "Isidor Almqvist", "", "Ante-post"),
      ParticipantUpdate("c964d9d8-fe98-4dd1-a029-28b7b4b24bdb", "687741", "Starfield Song", "", "Ante-post"),
      ParticipantUpdate("0690cce3-7622-4f34-90de-3e5db3992b15", "882222", "Heart Of Dreams", "", "Ante-post"),
      ParticipantUpdate("100c2866-f814-49fb-94f2-952d18b73bea", "849509", "Zalalaat", "", "Ante-post"),
      ParticipantUpdate("22f72fd7-041c-459b-835f-468adc0d6421", "849892", "Fairycake", "", "Ante-post"),
      ParticipantUpdate("8d75c92d-58c6-4c69-ae98-14194745192f", "867810", "Hallyday", "", "Ante-post"),
      ParticipantUpdate("bc3cb718-89e5-45b6-858d-93e32f81d06b", "882225", "Mr Mans", "", "Ante-post")
    ), 1589371671, 1589448679402L)

    // when
    val actual = objectUnderTest.containsValidParticipants(givenMsg)

    // then
    actual should be (false)
  }

}
