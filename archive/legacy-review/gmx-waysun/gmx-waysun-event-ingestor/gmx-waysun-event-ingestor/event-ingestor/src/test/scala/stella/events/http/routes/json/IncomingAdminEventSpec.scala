package stella.events.http.routes.json

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.jdk.CollectionConverters.ListHasAsScala

import org.scalatest.OptionValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks
import spray.json.JsObject
import spray.json.JsString

import stella.common.core.Clock
import stella.dataapi.platformevents.Source

import stella.events.MessageIdProvider
import stella.events.gen.Generators.incomingAdminEventGen
import stella.events.http.routes.json.IncomingAdminEvent.incomingAdminEventFormat
import stella.events.utils.ConstantClock
import stella.events.utils.ConstantMessageIdProvider

class IncomingAdminEventSpec
    extends AnyFlatSpec
    with should.Matchers
    with ScalaCheckDrivenPropertyChecks
    with OptionValues {
  private val messageOriginDateUTCFieldName = "messageOriginDateUTC"

  "JSON encoding and decoding" should "work properly" in {
    forAll(incomingAdminEventGen) { incomingEvent =>
      // WHEN: event is encoded
      // THEN: it's correct JSON
      val json = incomingAdminEventFormat.write(incomingEvent)
      // WHEN: JSON is decoded
      val decoded = incomingAdminEventFormat.read(json)
      // THEN: it's the same as an original event (no fields added, skipped or changed)
      decoded shouldBe incomingEvent
    }
  }

  it should s"fail when time zone of $messageOriginDateUTCFieldName is not UTC" in {
    val json = sampleIncomingAdminEventJson()
    val wrongValue = OffsetDateTime.now(ZoneOffset.ofHours(1)).toString
    val unexpectedJson =
      json.copy(fields = json.fields.updated(messageOriginDateUTCFieldName, JsString(wrongValue)))
    val expectedMessage =
      s"requirement failed: $messageOriginDateUTCFieldName `$wrongValue` should have zone offset UTC"
    the[IllegalArgumentException] thrownBy incomingAdminEventFormat.read(
      unexpectedJson) should have message expectedMessage
  }

  "toEventEnvelope" should "properly convert data" in {
    forAll(incomingAdminEventGen) { incomingEvent =>
      implicit val clock: Clock = ConstantClock.now()
      implicit val messageIdProvider: MessageIdProvider = ConstantMessageIdProvider.forRandomUuid()
      val eventEnvelope = incomingEvent.toEventEnvelope
      eventEnvelope.getMessageId shouldBe messageIdProvider.generateId()
      eventEnvelope.getMessageOriginDateUTC shouldBe incomingEvent.messageOriginDateUTC.toString
      eventEnvelope.getMessageProcessingDateUTC shouldBe clock.currentUtcOffsetDateTime().toString
      eventEnvelope.getSource shouldBe incomingEvent.source.getOrElse(Source.external)
      eventEnvelope.getEventName shouldBe incomingEvent.eventName
      eventEnvelope.getPayload.asScala shouldBe incomingEvent.payload.map(_.toDataApi)
    }
  }

  private def sampleIncomingAdminEventJson(): JsObject = {
    val event = incomingAdminEventGen.sample.value
    incomingAdminEventFormat.write(event).asJsObject
  }
}
