package eeg.waysun.events.validators.data

import java.util.UUID

import stella.dataapi.platformevents.{Field, Source}
import eeg.waysun.events.validators.Types.Raw

import scala.collection.JavaConverters._

object RawDataProvider extends DataProvider[(Raw.SourceKeyType, Raw.ValueType), Field] {

  override def buildFake(
      item: Int,
      eventName: String,
      projectId: String = UUID.randomUUID().toString,
      payloadData: Option[Seq[Field]] = None): (Raw.SourceKeyType, Raw.ValueType) = {

    val properPayloadData = payloadData match {
      case None =>
        Seq(
          new Field(faker.gameOfThrones().house(), faker.name().name()),
          new Field(faker.gameOfThrones().house(), faker.name().name()),
          new Field(faker.gameOfThrones().house(), faker.name().name())).asJava
      case Some(Seq())  => null
      case Some(fields) => fields.asJava
    }

    val eventId = faker.number().randomNumber().toString
    val userId = faker.number().randomNumber().toString
    val key = new Raw.SourceKeyType()
    key.setUserId(userId)
    key.setProjectId(projectId)

    val value = new Raw.ValueType()
    value.setMessageId(eventId)
    value.setEventName(eventName)
    value.setSource(Source.internal)
    value.setMessageProcessingDateUTC(faker.date().toString)
    value.setMessageOriginDateUTC(faker.date().toString)
    value.setPayload(properPayloadData)

    (key, value)
  }
}
