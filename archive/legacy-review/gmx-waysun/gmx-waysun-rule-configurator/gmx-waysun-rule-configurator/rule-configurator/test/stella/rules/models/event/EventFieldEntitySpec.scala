package stella.rules.models.event

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

import stella.rules.models.Ids.EventConfigurationId
import stella.rules.models.Ids.EventFieldId
import stella.rules.models.event.http.EventField

class EventFieldEntitySpec extends AnyFlatSpec with should.Matchers {

  "toEventField method" should "convert event field properly" in {
    FieldValueType.values.foreach { valueType =>
      val id = EventFieldId(1)
      val eventConfigurationId = EventConfigurationId(2)
      val name = "test_field.name"
      val eventFieldEntity = EventFieldEntity(id, eventConfigurationId, name, valueType)
      val expectedEventField = EventField(name, valueType)
      eventFieldEntity.toEventField shouldBe expectedEventField
    }
  }
}
