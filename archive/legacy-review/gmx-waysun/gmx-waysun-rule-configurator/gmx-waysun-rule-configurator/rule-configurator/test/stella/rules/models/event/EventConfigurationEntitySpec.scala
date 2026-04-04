package stella.rules.models.event

import org.scalacheck.Arbitrary
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import stella.common.models.Ids.ProjectId

import stella.rules.gen.Generators.eventFieldListGen
import stella.rules.gen.Generators.offsetDateTimeGen
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.Ids.EventConfigurationId
import stella.rules.models.Ids.EventFieldId
import stella.rules.models.event.http.EventConfiguration

class EventConfigurationEntitySpec extends AnyFlatSpec with should.Matchers with ScalaCheckDrivenPropertyChecks {

  "toEventConfiguration method" should "convert event configuration properly" in {
    forAll(Arbitrary.arbBool.arbitrary, eventFieldListGen, offsetDateTimeGen, offsetDateTimeGen) {
      (isActive, eventFields, createdAt, updatedAt) =>
        val id = EventConfigurationId(1)
        val eventId = EventConfigurationEventId.random()
        val name = "test-name"
        val projectId = ProjectId.random()
        val description = "Test conf description"
        val eventConfigEntity = EventConfigurationEntity(
          id,
          eventId,
          projectId,
          name,
          description: String,
          fields = eventFields.zipWithIndex.map { case (f, i) =>
            EventFieldEntity(EventFieldId(i), id, f.name, f.valueType)
          },
          isActive,
          createdAt,
          updatedAt)
        val expectedEventConfig =
          EventConfiguration(eventId, name, description: String, eventFields, isActive, createdAt, updatedAt)
        eventConfigEntity.toEventConfiguration shouldBe expectedEventConfig
    }
  }
}
