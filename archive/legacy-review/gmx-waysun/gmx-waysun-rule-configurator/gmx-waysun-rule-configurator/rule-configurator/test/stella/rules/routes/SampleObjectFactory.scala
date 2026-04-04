package stella.rules.routes

import java.time.OffsetDateTime

import scala.concurrent.Future

import akka.util.Timeout
import org.scalacheck.Gen
import org.scalatest.Assertions
import org.scalatest.OptionValues
import org.scalatest.concurrent.Eventually
import play.api.http.HeaderNames
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.mvc.Result
import play.api.test.FakeHeaders
import play.api.test.Helpers.contentAsString
import spray.json.JsonReader
import spray.json.enrichString

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock
import stella.common.core.OffsetDateTimeUtils
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.StellaAuthContext
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.achievement.AchievementTriggerBehaviour
import stella.rules.models.achievement.OperationType
import stella.rules.models.achievement.RequestType
import stella.rules.models.achievement.http.AchievementAction
import stella.rules.models.achievement.http.AchievementCondition
import stella.rules.models.achievement.http.AchievementEventActionPayload
import stella.rules.models.achievement.http.AchievementWebhookActionPayload
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest
import stella.rules.models.achievement.http.EventActionField
import stella.rules.models.achievement.http.UpdateAchievementRuleConfigurationRequest
import stella.rules.models.achievement.http.WebhookActionEventConfig
import stella.rules.models.achievement.http.WebhookActionField
import stella.rules.models.aggregation.AggregationConditionType
import stella.rules.models.aggregation.AggregationConditionType.Eq
import stella.rules.models.aggregation.AggregationConditionType.Ge
import stella.rules.models.aggregation.AggregationConditionType.Neq
import stella.rules.models.aggregation.AggregationConditionType.Nn
import stella.rules.models.aggregation.AggregationType.Count
import stella.rules.models.aggregation.AggregationType.Max
import stella.rules.models.aggregation.AggregationType.Sum
import stella.rules.models.aggregation.IntervalType
import stella.rules.models.aggregation.IntervalType.Days
import stella.rules.models.aggregation.IntervalType.Months
import stella.rules.models.aggregation.IntervalType.Never
import stella.rules.models.aggregation.http.AggregationRuleCondition
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.CreateRequestResetFrequency
import stella.rules.models.aggregation.http.IntervalDetails
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.models.event.FieldValueType
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.EventField
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.routes.TestConstants.JsonFieldName

object SampleObjectFactory extends Assertions with OptionValues with Eventually {

  implicit class GenOps[T](gen: Gen[T]) {
    def getOne: T = eventually {
      gen.sample.value
    }
  }

  final case class TestIntervalDetails(length: Int, windowCountLimit: Option[Int] = None)

  implicit val clock: Clock = JavaOffsetDateTimeClock

  val defaultHeaders: FakeHeaders = FakeHeaders(Seq(HeaderNames.HOST -> "localhost"))

  val primaryProjectId: ProjectId = ProjectId.random()
  val additionalProjectId: ProjectId = ProjectId.random()
  val additionalProjectId2: ProjectId = ProjectId.random()

  val testAuthContext: StellaAuthContext =
    StellaAuthContext(
      FullyPermissivePermissions,
      userId = UserId.random(),
      primaryProjectId = primaryProjectId,
      additionalProjectIds = Set(additionalProjectId, additionalProjectId2))

  val testEventFieldName = "field1"

  val createEventConfigurationRequest: CreateEventConfigurationRequest =
    CreateEventConfigurationRequest(
      "sample-event-config",
      Some("Sample event configuration"),
      FieldValueType.values.zipWithIndex.map { case (valueType, index) =>
        EventField(s"field$index", valueType)
      }.toList)

  val createEventConfigurationRequest2: CreateEventConfigurationRequest =
    CreateEventConfigurationRequest(
      "sample-event-config2",
      Some("Sample event configuration2"),
      FieldValueType.values.zipWithIndex.map { case (valueType, index) =>
        EventField(s"field_2_$index", valueType)
      }.toList)

  val createEventConfigurationRequestWithEmptyDescription: CreateEventConfigurationRequest =
    CreateEventConfigurationRequest(
      "sample-event-config3",
      None,
      FieldValueType.values.zipWithIndex.map { case (valueType, index) =>
        EventField(s"field_3_$index", valueType)
      }.toList)

  val createEventConfigurationRequestJson: JsObject =
    CreateEventConfigurationRequest.createEventConfigurationRequestPlayFormat.writes(createEventConfigurationRequest)

  val activateEventConfigurationRequest: UpdateEventConfigurationRequest =
    UpdateEventConfigurationRequest(isActive = Some(true), description = None)

  val deactivateEventConfigurationRequest: UpdateEventConfigurationRequest =
    UpdateEventConfigurationRequest(isActive = Some(false), description = None)

  val activateEventConfigurationRequestJson: JsObject =
    UpdateEventConfigurationRequest.updateEventConfigurationRequestPlayFormat.writes(activateEventConfigurationRequest)

  val deactivateEventConfigurationRequestJson: JsObject =
    UpdateEventConfigurationRequest.updateEventConfigurationRequestPlayFormat.writes(
      deactivateEventConfigurationRequest)

  def createAggregationRuleConfigurationRequest(
      eventConfiguration: EventConfiguration): CreateAggregationRuleConfigurationRequest =
    createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfiguration.eventId)

  def createAggregationRuleConfigurationRequest2(
      eventConfiguration: EventConfiguration): CreateAggregationRuleConfigurationRequest =
    createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfiguration.eventId)

  val createAggregationRuleConfigurationRequest: CreateAggregationRuleConfigurationRequest =
    CreateAggregationRuleConfigurationRequest(
      name = "sample-aggregation-rule-config",
      description = "Sample aggregation rule configuration",
      eventConfigurationId = EventConfigurationEventId.random(),
      resetFrequency = CreateRequestResetFrequency(
        interval = Days,
        windowStartDateUTC = None,
        intervalDetails = Some(IntervalDetails(length = 20, windowCountLimit = None))),
      aggregationType = Sum,
      aggregationFieldName = "agg_field_name",
      aggregationGroupByFieldName = Some("group_by_field_name"),
      aggregationConditions = List(
        AggregationRuleCondition(eventFieldName = "event_field_name", conditionType = Eq, value = Some("42")),
        AggregationRuleCondition(eventFieldName = "event_field_name.b", conditionType = Ge, value = Some("-17.2"))))

  val createAggregationRuleConfigurationRequest2: CreateAggregationRuleConfigurationRequest =
    CreateAggregationRuleConfigurationRequest(
      name = "sample-aggregation-rule-config2",
      description = "Sample aggregation rule configuration2",
      eventConfigurationId = EventConfigurationEventId.random(),
      resetFrequency = CreateRequestResetFrequency(
        interval = Months,
        windowStartDateUTC = Some(OffsetDateTimeUtils.nowUtc()),
        intervalDetails = Some(IntervalDetails(length = 1, windowCountLimit = Some(20)))),
      aggregationType = Max,
      aggregationFieldName = "agg_field_name2.sth.sth",
      aggregationGroupByFieldName = Some("group_by_field_name2"),
      aggregationConditions =
        List(AggregationRuleCondition(eventFieldName = "event_field_name2", conditionType = Nn, value = None)))

  val createAggregationRuleConfigurationRequest3: CreateAggregationRuleConfigurationRequest =
    CreateAggregationRuleConfigurationRequest(
      name = "sample-aggregation-rule-config3",
      description = "Sample aggregation rule configuration3",
      eventConfigurationId = EventConfigurationEventId.random(),
      resetFrequency = CreateRequestResetFrequency(interval = Never, windowStartDateUTC = None, intervalDetails = None),
      aggregationType = Count,
      aggregationFieldName = "agg_field_name3",
      aggregationGroupByFieldName = Some("group_by_field_name3"),
      aggregationConditions =
        List(AggregationRuleCondition(eventFieldName = "event_field_name3", conditionType = Neq, value = Some("aaa"))))

  val createAchievementRuleConfigurationWithEventPayloadRequest: CreateAchievementRuleConfigurationRequest =
    CreateAchievementRuleConfigurationRequest(
      achievementName = "sample-achievement-rule-config",
      description = "Sample achievement rule config",
      triggerBehaviour = Some(AchievementTriggerBehaviour.Always),
      action = AchievementAction(
        AchievementEventActionPayload(
          EventConfigurationEventId.random(),
          List(
            EventActionField(
              fieldName = "sample_event_payload_field_name",
              operation = OperationType.Static,
              aggregationRuleId = None,
              value = "sample-value")))),
      conditions = List(
        AchievementCondition(
          AggregationRuleConfigurationRuleId.random(),
          "sample_aggregation_field",
          AggregationConditionType.Eq,
          Some("sample-value"))))

  val createAchievementRuleConfigurationWithWebhookPayloadWithEventRequest: CreateAchievementRuleConfigurationRequest =
    CreateAchievementRuleConfigurationRequest(
      achievementName = "sample-achievement-rule-config2",
      description = "Sample achievement rule config 2",
      triggerBehaviour = Some(AchievementTriggerBehaviour.OnlyOnce),
      action = AchievementAction(
        AchievementWebhookActionPayload(
          RequestType.Post,
          targetUrl = "http://sample.url",
          eventConfig = Some(WebhookActionEventConfig(
            EventConfigurationEventId.random(),
            List(
              WebhookActionField(
                fieldName = "sample.event_payload_field_name2",
                operation = OperationType.Static,
                aggregationRuleId = None,
                value = "sample-value2")))))),
      conditions = List(
        AchievementCondition(
          AggregationRuleConfigurationRuleId.random(),
          "sample_aggregation_field2",
          AggregationConditionType.Eq,
          Some("sample-value2"))))

  val createAchievementRuleConfigurationWithWebhookPayloadWithoutEventRequest
      : CreateAchievementRuleConfigurationRequest =
    CreateAchievementRuleConfigurationRequest(
      achievementName = "sample-achievement-rule-config3",
      description = "Sample achievement rule config 3",
      triggerBehaviour = Some(AchievementTriggerBehaviour.Always),
      action = AchievementAction(
        AchievementWebhookActionPayload(RequestType.Delete, targetUrl = "http://sample2.url", eventConfig = None)),
      conditions = List(
        AchievementCondition(
          AggregationRuleConfigurationRuleId.random(),
          "sample_aggregation_field3",
          AggregationConditionType.Eq,
          Some("sample-value3"))))

  val createAggregationRuleConfigurationRequestJson: JsObject =
    CreateAggregationRuleConfigurationRequest.createAggregationRuleConfigurationRequestPlayFormat.writes(
      createAggregationRuleConfigurationRequest)

  val activateAggregationRuleConfigurationRequest: UpdateAggregationRuleConfigurationRequest =
    UpdateAggregationRuleConfigurationRequest(isActive = Some(true), description = None)

  val deactivateAggregationRuleConfigurationRequest: UpdateAggregationRuleConfigurationRequest =
    UpdateAggregationRuleConfigurationRequest(isActive = Some(false), description = None)

  val activateAggregationRuleConfigurationRequestJson: JsObject =
    UpdateAggregationRuleConfigurationRequest.updateAggregationRuleConfigurationRequestPlayFormat.writes(
      activateAggregationRuleConfigurationRequest)

  val deactivateAggregationRuleConfigurationRequestJson: JsObject =
    UpdateAggregationRuleConfigurationRequest.updateAggregationRuleConfigurationRequestPlayFormat.writes(
      deactivateAggregationRuleConfigurationRequest)

  val activateAchievementRuleConfigurationRequest: UpdateAchievementRuleConfigurationRequest =
    UpdateAchievementRuleConfigurationRequest(isActive = Some(true), description = None)

  val deactivateAchievementRuleConfigurationRequest: UpdateAchievementRuleConfigurationRequest =
    UpdateAchievementRuleConfigurationRequest(isActive = Some(false), description = None)

  val activateAchievementRuleConfigurationRequestJson: JsObject =
    UpdateAchievementRuleConfigurationRequest.updateAchievementRuleConfigurationRequestPlayFormat.writes(
      activateAchievementRuleConfigurationRequest)

  val deactivateAchievementRuleConfigurationRequestJson: JsObject =
    UpdateAchievementRuleConfigurationRequest.updateAchievementRuleConfigurationRequestPlayFormat.writes(
      deactivateAchievementRuleConfigurationRequest)

  def eventConfigJsonWithChangedName(json: JsObject, name: String): JsObject =
    json.copy(json.value.concat(List(JsonFieldName.eventConfigName -> JsString(name))))

  def aggregationRuleConfigJsonWithChangedName(json: JsObject, name: String): JsObject =
    json.copy(json.value.concat(List(JsonFieldName.aggregationRuleConfigName -> JsString(name))))

  def aggregationRuleConfigJsonWithChangedAggregationFieldName(json: JsObject, name: String): JsObject =
    json.copy(json.value.concat(List(JsonFieldName.aggregationFieldName -> JsString(name))))

  def aggregationRuleConfigJsonWithChangedAggregationGroupByFieldName(json: JsObject, name: String): JsObject =
    json.copy(json.value.concat(List(JsonFieldName.aggregationGroupByFieldName -> JsString(name))))

  def aggregationRuleConfigJsonWithChangedResetFrequency(
      json: JsObject,
      interval: IntervalType,
      windowStartDateUTC: Option[OffsetDateTime],
      intervalDetails: Option[TestIntervalDetails]): JsObject = {
    val intervalEntry = JsonFieldName.resetFrequencyInterval -> JsString(interval.entryName)
    val intervalDetailsEntry = intervalDetails.map(details =>
      JsonFieldName.resetFrequencyIntervalDetails -> JsObject(
        List(
          Some(JsonFieldName.resetFrequencyLength -> JsNumber(details.length)),
          details.windowCountLimit.map(limit => JsonFieldName.windowCountLimit -> JsNumber(limit))).flatten))
    val windowStartDateEntry =
      windowStartDateUTC.map(date => JsonFieldName.windowStartDateUTC -> JsString(date.toString))
    val resetFrequencyEntry =
      JsonFieldName.resetFrequency -> JsObject(
        List(Some(intervalEntry), windowStartDateEntry, intervalDetailsEntry).flatten)
    json.copy(json.value.concat(List(resetFrequencyEntry)))
  }

  val createAchievementRuleConfigurationRequestWithEventPayloadJson: JsObject =
    CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
      createAchievementRuleConfigurationWithEventPayloadRequest)

  val createAchievementRuleConfigurationRequestWithWebhookWithEventPayloadJson: JsObject =
    CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
      createAchievementRuleConfigurationWithWebhookPayloadWithEventRequest)

  val createAchievementRuleConfigurationRequestWithWebhookWithoutEventPayloadJson: JsObject =
    CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
      createAchievementRuleConfigurationWithWebhookPayloadWithoutEventRequest)

  def achievementRuleConfigJsonWithChangedName(json: JsObject, name: String): JsObject =
    json.copy(json.value.concat(List(JsonFieldName.achievementRuleConfigName -> JsString(name))))

  def achievementRuleConfigWithWebhookJsonWithChangedTargetUrl(json: JsObject, url: String): JsObject = {
    val jsonTransformer = (__ \ Symbol("action") \ Symbol("payload") \ Symbol("targetUrl")).json
      .update(__.read[JsString].map { _ => JsString(url) })
    json.transform(jsonTransformer).get
  }

  def eventConfigJsonWithAdditionalFields(json: JsObject, additionalFields: (String, String)*): JsObject = {
    val fields = json.value.get(JsonFieldName.fields).value match {
      case JsArray(elements) =>
        JsArray(elements ++ additionalFields.map { case (fieldName, valueType) =>
          createEventFieldJson(fieldName, valueType)
        })
      case _ => throw new IllegalArgumentException(s"Unexpected ${JsonFieldName.fields} type")
    }
    json.copy(json.value.concat(List(JsonFieldName.fields -> fields)))
  }

  def createEventFieldJson(fieldName: String, fieldType: String): JsObject =
    JsObject(List(JsonFieldName.eventFieldName -> JsString(fieldName), JsonFieldName.valueType -> JsString(fieldType)))

  def aggregationRuleConfigJsonWithAdditionalRuleCondition(
      json: JsObject,
      eventFieldName: String,
      conditionType: AggregationConditionType,
      value: Option[String]): JsObject = {
    val fields = json.value.get(JsonFieldName.aggregationConditions).value match {
      case JsArray(elements) =>
        JsArray(elements.appended(createAggregationRuleConditionJson(eventFieldName, conditionType, value)))
      case _ => throw new IllegalArgumentException(s"Unexpected ${JsonFieldName.aggregationConditions} type")
    }
    json.copy(json.value.concat(List(JsonFieldName.aggregationConditions -> fields)))
  }

  def createAggregationRuleConditionJson(
      fieldName: String,
      conditionType: AggregationConditionType,
      value: Option[String]): JsObject = {
    val valueEntry = value.map(v => JsonFieldName.value -> JsString(v))
    val entries = List(
      JsonFieldName.aggregationRuleConditionFieldName -> JsString(fieldName),
      JsonFieldName.conditionType -> JsString(conditionType.entryName)).appendedAll(valueEntry.toList)
    JsObject(entries)
  }

  def achievementRuleConfigJsonWithAdditionalEventPayloadField(
      json: JsObject,
      fieldName: String,
      operationType: OperationType,
      aggregationRuleId: Option[AggregationRuleConfigurationRuleId],
      value: String): JsObject = {
    val jsonTransformer =
      (__ \ Symbol("action") \ Symbol("payload") \ Symbol("setFields")).json.update(__.read[JsArray].map { o =>
        o :+ createAchievementEventPayloadJson(fieldName, operationType, aggregationRuleId, value)
      })
    json ++ json.transform(jsonTransformer).get
  }

  def achievementRuleConfigJsonWithAdditionalWebhookPayloadEventField(
      json: JsObject,
      fieldName: String,
      operationType: OperationType,
      aggregationRuleId: Option[AggregationRuleConfigurationRuleId],
      value: String): JsObject = {
    val jsonTransformer = (__ \ Symbol("action") \ Symbol("payload") \ Symbol("eventConfig") \ Symbol("setFields")).json
      .update(__.read[JsArray].map { o =>
        o :+ createAchievementEventPayloadJson(fieldName, operationType, aggregationRuleId, value)
      })
    json ++ json.transform(jsonTransformer).get
  }

  def achievementRuleConfigJsonWithAdditionalCondition(
      json: JsObject,
      aggregationRuleId: AggregationRuleConfigurationRuleId,
      fieldName: String,
      conditionType: AggregationConditionType,
      value: Option[String]): JsObject = {
    val jsonTransformer = (__ \ Symbol("conditions")).json.update(__.read[JsArray].map { o =>
      o :+ createAchievementConditionJson(aggregationRuleId, fieldName, conditionType, value)
    })
    json ++ json.transform(jsonTransformer).get
  }

  def createAchievementEventPayloadJson(
      fieldName: String,
      operationType: OperationType,
      aggregationRuleId: Option[AggregationRuleConfigurationRuleId],
      value: String): JsObject = {
    val aggregationRuleIdEntry =
      aggregationRuleId.map(id => JsonFieldName.achievementAggregationRuleId -> JsString(id.toString)).toList
    val entries = List(
      JsonFieldName.achievementEventPayloadFieldName -> JsString(fieldName),
      JsonFieldName.achievementOperationType -> JsString(operationType.entryName),
      JsonFieldName.value -> JsString(value)) ++ aggregationRuleIdEntry
    JsObject(entries)
  }

  def createAchievementConditionJson(
      aggregationRuleId: AggregationRuleConfigurationRuleId,
      aggregationField: String,
      conditionType: AggregationConditionType,
      value: Option[String]): JsObject = {
    val entries = List(
      JsonFieldName.achievementAggregationRuleId -> JsString(aggregationRuleId.toString),
      JsonFieldName.achievementAggregationField -> JsString(aggregationField),
      JsonFieldName.achievementConditionType -> JsString(conditionType.entryName)).appendedAll(value.map(v =>
      JsonFieldName.value -> JsString(v)))
    JsObject(entries)
  }

  def errorOutputResponse(errorCode: PresentationErrorCode): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode))

  def errorOutputResponse(errorCode: PresentationErrorCode, errorMessage: String): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode, errorMessage))

  def contentAs[T](res: Future[Result])(implicit reader: JsonReader[T], timeout: Timeout): T =
    reader.read(contentAsString(res).parseJson)

  def dummyNonBlankString(wrongLength: Int) = List.fill(wrongLength)("a").mkString
}
