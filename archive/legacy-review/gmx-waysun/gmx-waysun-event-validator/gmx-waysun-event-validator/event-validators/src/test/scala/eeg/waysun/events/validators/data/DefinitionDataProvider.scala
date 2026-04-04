package eeg.waysun.events.validators.data

import eeg.waysun.events.validators.Types.Definition
import stella.dataapi.eventconfigurations.EventField
import stella.dataapi.validators.FieldType

import java.util.UUID
import scala.collection.JavaConverters._

object DefinitionDataProvider extends DataProvider[(Definition.SourceKeyType, Definition.ValueType), EventField] {

  override def buildFake(
      item: Int,
      eventName: String,
      projectId: String = UUID.randomUUID().toString,
      payloadData: Option[Seq[EventField]] = None): (Definition.SourceKeyType, Definition.ValueType) = {

    val properPayloadData = payloadData match {
      case None =>
        Seq(
          new EventField(faker.gameOfThrones().house(), FieldType.String.name),
          new EventField(faker.gameOfThrones().house(), FieldType.String.name),
          new EventField(faker.gameOfThrones().house(), FieldType.String.name)).asJava
      case Some(Seq()) => null
      case Some(_)     => payloadData.get.asJava
    }

    val key = new Definition.SourceKeyType()
    key.setEventId(s"eventid-$item")
    key.setProjectId(projectId)
    key.setName(eventName)
    val value = new Definition.ValueType()

    value.setFields(properPayloadData)

    (key, value)
  }
}
