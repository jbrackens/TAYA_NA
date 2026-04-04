package eeg.waysun.events.aggregation.data.generators.instances

import com.github.javafaker.Faker
import stella.dataapi.aggregation.{AggregationCondition, AggregationType, ConditionType}

object instances {

  case class UserId(value: String)
  case class EventName(value: String)
  case class EventId(value: String)
  case class EventDefinitionRuleId(value: String)
  case class ProjectId(value: String)
  case class AggregationRuleId(value: String)
  case class MessageId(value: String)

  import Scenario._
  case class Scenario(
      aggregationFieldName: String,
      aggregationGroupByFieldName: String,
      fields: Map[FieldName, (FieldType, FieldValue)],
      aggregationType: AggregationType,
      conditions: Seq[AggregationCondition] = Seq.empty) {

    def withCondition(field: FieldName, conditionType: ConditionType, to: FieldValue) =
      copy(conditions = conditions :+ AggregationCondition
        .newBuilder()
        .setConditionType(conditionType)
        .setEventFieldName(field.name)
        .setValue(to.value)
        .build())
  }
  object Scenario {
    case class FieldName(name: String)
    case class FieldType(fType: String)
    case class FieldValue(value: String)
  }

  object dataset {
    val userExample: String = Faker.instance().name().fullName()
    val countryExample: String = Faker.instance().country().name()
    implicit val userId: UserId = UserId(userExample)
    implicit val eventName: EventName = EventName("test-event-01")
    implicit val eventDefinitionRuleId: EventDefinitionRuleId = EventDefinitionRuleId.apply("count-persons-per-country")
    implicit val companyId: ProjectId = ProjectId.apply("UNESCO")
    implicit val aggregationRuleId: AggregationRuleId = AggregationRuleId.apply("count-persons-per-country")
    implicit val messageId: MessageId = MessageId.apply("a")
    implicit val countPersonsByCountry: Scenario = Scenario(
      aggregationFieldName = "user",
      aggregationGroupByFieldName = "country",
      fields = Map(
        FieldName("country") -> Tuple2(FieldType("string"), FieldValue(countryExample)),
        FieldName("user") -> Tuple2(FieldType("string"), FieldValue(userExample)),
        FieldName("extra") -> Tuple2(FieldType("string"), FieldValue("extra"))),
      aggregationType = AggregationType.COUNT)
    val scenario = countPersonsByCountry
  }

}
