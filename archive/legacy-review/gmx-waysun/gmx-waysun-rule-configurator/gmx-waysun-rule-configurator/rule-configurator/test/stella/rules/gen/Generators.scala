package stella.rules.gen

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Date

import org.scalacheck.Arbitrary
import org.scalacheck.Gen

import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.achievement.AchievementTriggerBehaviour
import stella.rules.models.achievement.OperationType
import stella.rules.models.achievement.RequestType
import stella.rules.models.achievement.http.AchievementAction
import stella.rules.models.achievement.http.AchievementCondition
import stella.rules.models.achievement.http.AchievementEventActionPayload
import stella.rules.models.achievement.http.AchievementRuleConfiguration
import stella.rules.models.achievement.http.AchievementWebhookActionPayload
import stella.rules.models.achievement.http.EventActionField
import stella.rules.models.achievement.http.WebhookActionEventConfig
import stella.rules.models.achievement.http.WebhookActionField
import stella.rules.models.achievement.http._
import stella.rules.models.aggregation.AggregationConditionType
import stella.rules.models.aggregation.AggregationConditionType.Nn
import stella.rules.models.aggregation.AggregationType
import stella.rules.models.aggregation.IntervalType
import stella.rules.models.aggregation.IntervalType.Never
import stella.rules.models.aggregation.http.AggregationRuleCondition
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.IntervalDetails
import stella.rules.models.aggregation.http.ResetFrequency
import stella.rules.models.event.FieldValueType
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.EventField
import stella.rules.routes.TestConstants._

object Generators {

  lazy val eventConfigListGen: Gen[List[EventConfiguration]] = Gen.listOf(eventConfigGen)

  lazy val eventConfigGen: Gen[EventConfiguration] = for {
    eventId <- eventIdGen
    name <- eventConfigNameGen
    description <- stringGen()
    fields <- eventFieldListGen
    isActive <- Arbitrary.arbBool.arbitrary
    createdAt <- offsetDateTimeGen
    updatedAt <- offsetDateTimeGen
  } yield {
    val fieldsWithUniqueName = fields.distinctBy(_.name)
    EventConfiguration(eventId, name, description, fieldsWithUniqueName, isActive, createdAt, updatedAt)
  }

  lazy val eventIdGen: Gen[EventConfigurationEventId] = Arbitrary.arbUuid.arbitrary.map(EventConfigurationEventId.apply)

  lazy val aggregationRuleConfigListGen: Gen[List[AggregationRuleConfiguration]] = Gen.listOf(aggregationRuleConfigGen)

  lazy val aggregationRuleIdGen: Gen[AggregationRuleConfigurationRuleId] =
    Arbitrary.arbUuid.arbitrary.map(AggregationRuleConfigurationRuleId.apply)

  lazy val aggregationRuleConfigGen: Gen[AggregationRuleConfiguration] =
    for {
      ruleId <- aggregationRuleIdGen
      name <- nonBlankStringGen(minSize = 1, maxSize = maxAggregationRuleConfigNameLength)
      description <- stringGen()
      eventId <- eventIdGen
      resetFrequency <- resetFrequencyGen
      aggregationType <- aggregationTypeGen
      aggregationFieldName <- eventFieldNameGen
      aggregationGroupByFieldName <- Gen.option(eventFieldNameGen)
      aggregationRuleConditions <- aggregationRuleConditionListGen
      isActive <- Arbitrary.arbBool.arbitrary
      createdAt <- offsetDateTimeGen
      updatedAt <- offsetDateTimeGen
    } yield AggregationRuleConfiguration(
      ruleId,
      name,
      description,
      eventId,
      resetFrequency,
      aggregationType,
      aggregationFieldName,
      aggregationGroupByFieldName,
      aggregationRuleConditions,
      isActive,
      createdAt,
      updatedAt)

  lazy val achievementRuleConfigListGen: Gen[List[AchievementRuleConfiguration]] = Gen.listOf(achievementRuleConfigGen)

  lazy val achievementRuleConfigGen: Gen[AchievementRuleConfiguration] =
    for {
      ruleId <- Arbitrary.arbUuid.arbitrary.map(AchievementConfigurationRuleId.apply)
      name <- nonBlankStringGen(minSize = 1, maxSize = maxAchievementConfigNameLength)
      description <- stringGen()
      triggerBehaviour <- achievementTriggerBehaviourGen
      conditions <- nonEmptyAchievementConditionListGen
      aggregationRuleIds = conditions.map(_.aggregationRuleId)
      action <- achievementActionGen(aggregationRuleIds)
      isActive <- Arbitrary.arbBool.arbitrary
      createdAt <- offsetDateTimeGen
      updatedAt <- offsetDateTimeGen
    } yield AchievementRuleConfiguration(
      ruleId,
      name,
      description,
      triggerBehaviour,
      action,
      conditions,
      isActive,
      createdAt,
      updatedAt)

  lazy val offsetDateTimeGen: Gen[OffsetDateTime] =
    Gen.choose(min = 1, max = System.currentTimeMillis()).flatMap { timestamp =>
      OffsetDateTime.ofInstant(new Date(timestamp).toInstant, ZoneOffset.UTC)
    }

  val achievementTriggerBehaviourGen: Gen[AchievementTriggerBehaviour] =
    Gen.oneOf(AchievementTriggerBehaviour.OnlyOnce, AchievementTriggerBehaviour.Always)

  lazy val eventFieldListGen: Gen[List[EventField]] = Gen.listOf(eventFieldGen)

  lazy val eventFieldGen: Gen[EventField] =
    for {
      fieldName <- eventFieldNameGen
      fieldValueType <- fieldValueTypeGen
    } yield EventField(fieldName, fieldValueType)

  lazy val fieldValueTypeGen: Gen[FieldValueType] = Gen.oneOf(FieldValueType.values)

  lazy val resetFrequencyGen: Gen[ResetFrequency] = for {
    intervalType <- intervalTypeGen
    windowStartDateUTC <- offsetDateTimeGen.suchThat(_.getYear >= 1970)
    intervalDetails <- if (intervalType == Never) Gen.const(None) else Gen.some(intervalDetailsGen)
  } yield ResetFrequency(intervalType, windowStartDateUTC, intervalDetails)

  lazy val intervalTypeGen: Gen[IntervalType] = Gen.oneOf(IntervalType.values)

  lazy val intervalDetailsGen: Gen[IntervalDetails] = for {
    length <- Gen.chooseNum(1, 500)
    windowCountLimit <- Gen.option(Gen.chooseNum(1, 400))
  } yield IntervalDetails(length, windowCountLimit)

  lazy val aggregationTypeGen: Gen[AggregationType] = Gen.oneOf(AggregationType.values)

  lazy val aggregationRuleConditionListGen: Gen[List[AggregationRuleCondition]] =
    Gen.listOf(aggregationRuleConditionGen)

  lazy val aggregationRuleConditionGen: Gen[AggregationRuleCondition] =
    for {
      eventFieldName <- eventFieldNameGen
      conditionType <- aggregationConditionTypeGen
      value <-
        if (conditionType == Nn) Gen.const(None)
        else Gen.some(nonBlankStringGen(minSize = 1, maxSize = maxAggregationRuleConditionValueLength))
    } yield AggregationRuleCondition(eventFieldName, conditionType, value)

  lazy val nonEmptyAchievementConditionListGen: Gen[List[AchievementCondition]] =
    Gen.nonEmptyListOf(achievementConditionGen)

  lazy val achievementConditionGen: Gen[AchievementCondition] =
    for {
      aggregationRuleId <- aggregationRuleIdGen
      eventFieldName <- eventFieldNameGen
      conditionType <- aggregationConditionTypeGen
      value <-
        if (conditionType == AggregationConditionType.Nn) Gen.const(None)
        else Gen.some(nonBlankStringGen(minSize = 1, maxSize = maxAggregationRuleConditionValueLength))
    } yield AchievementCondition(aggregationRuleId, eventFieldName, conditionType, value)

  def achievementActionGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[AchievementAction] =
    Gen.oneOf(
      achievementEventActionGen(possibleAggregationRuleIds),
      achievementWebhookActionGen(possibleAggregationRuleIds))

  def achievementEventActionGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[AchievementAction] =
    achievementEventActionPayloadGen(possibleAggregationRuleIds).map(AchievementAction.apply)

  def achievementEventActionPayloadGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[AchievementEventActionPayload] =
    for {
      eventId <- eventIdGen
      fields <- achievementEventPayloadFieldsGen(possibleAggregationRuleIds)
    } yield AchievementEventActionPayload(eventId, fields)

  def achievementWebhookActionGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[AchievementAction] =
    achievementWebhookActionPayloadGen(possibleAggregationRuleIds).map(AchievementAction.apply)

  def achievementWebhookActionPayloadGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[AchievementWebhookActionPayload] =
    for {
      requestType <- requestTypeGen
      urlPrefix <- Gen.oneOf("http://", "https://", "")
      targetUrlPart1 <- stringGen(
        minSize = 1,
        maxSize = maxAchievementWebhookActionTargetUrlLength - urlPrefix.length - 4)
      targetUrlPart2 <- stringGen(
        minSize = 3,
        maxSize = maxAchievementWebhookActionTargetUrlLength - targetUrlPart1.length - urlPrefix.length - 1)
      eventConfig <- Gen.option(webhookActionEventConfigGen(possibleAggregationRuleIds))
    } yield AchievementWebhookActionPayload(requestType, s"$urlPrefix$targetUrlPart1.$targetUrlPart2", eventConfig)

  lazy val requestTypeGen: Gen[RequestType] = Gen.oneOf(RequestType.values)

  def webhookActionEventConfigGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[WebhookActionEventConfig] =
    for {
      eventId <- eventIdGen
      fields <- achievementWebhookPayloadFieldsGen(possibleAggregationRuleIds)
    } yield WebhookActionEventConfig(eventId, fields)

  def achievementEventPayloadFieldsGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[List[EventActionField]] =
    if (possibleAggregationRuleIds.isEmpty) Gen.const(Nil)
    else Gen.listOf(achievementEventPayloadFieldGen(possibleAggregationRuleIds))

  def achievementEventPayloadFieldGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[EventActionField] =
    for {
      fieldName <- eventFieldNameGen
      operationType <- operationTypeGen
      aggregationRuleId <-
        if (operationType == OperationType.ReplaceFrom) Gen.some(Gen.oneOf(possibleAggregationRuleIds))
        else Gen.const(None)
      value <- nonBlankStringGen(minSize = 1, maxSize = maxAchievementValueLength)
    } yield EventActionField(fieldName, operationType, aggregationRuleId, value)

  def achievementWebhookPayloadFieldsGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[List[WebhookActionField]] =
    if (possibleAggregationRuleIds.isEmpty) Gen.const(Nil)
    else Gen.listOf(achievementWebhookPayloadFieldGen(possibleAggregationRuleIds))

  def achievementWebhookPayloadFieldGen(
      possibleAggregationRuleIds: Seq[AggregationRuleConfigurationRuleId]): Gen[WebhookActionField] =
    for {
      fieldName <- eventFieldNameGen
      operationType <- operationTypeGen
      aggregationRuleId <-
        if (operationType == OperationType.ReplaceFrom) Gen.some(Gen.oneOf(possibleAggregationRuleIds))
        else Gen.const(None)
      value <- nonBlankStringGen(minSize = 1, maxSize = maxAchievementValueLength)
    } yield WebhookActionField(fieldName, operationType, aggregationRuleId, value)

  lazy val operationTypeGen: Gen[OperationType] = Gen.oneOf(OperationType.values)

  lazy val aggregationConditionTypeGen: Gen[AggregationConditionType] = Gen.oneOf(AggregationConditionType.values)

  lazy val eventConfigNameGen: Gen[String] =
    Gen.choose(min = 1, max = maxEventConfigNameLength).flatMap(eventConfigNameStringGen)

  lazy val emptyOrBlankStringGen: Gen[String] = Gen.oneOf("", " ", "  ", "\t", " \t")

  def eventConfigNameStringGen(size: Int): Gen[String] =
    Gen.stringOfN(size, Gen.oneOf(Gen.alphaLowerChar, Gen.numChar, Gen.oneOf('.', '-')))

  lazy val eventFieldNameGen: Gen[String] =
    (for {
      prefix <- Gen.oneOf(
        "a",
        "something.important",
        "Something.important",
        "s0me_Thing.important",
        "s0me_Thing.IMP_0RTant",
        "something._.important")
      suffix <- Gen.option(Arbitrary.arbBigInt.arbitrary.map(_.abs))
    } yield prefix + suffix.getOrElse("")).suchThat(_.length <= maxEventFieldNameLength)

  lazy val eventFieldNameNotMatchingPatternGen: Gen[String] = Gen.oneOf(
    emptyOrBlankStringGen,
    Gen.oneOf(
      "field-name",
      "5omething.important",
      "something.1mportant",
      "something..important",
      "something..7mportant",
      "something."))

  def nonBlankStringGen(maxSize: Int = 32, minSize: Int): Gen[String] = {
    require(minSize > 0, "Min size has to be greater than 0")
    stringGen(maxSize, minSize).suchThat(!_.isBlank)
  }

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }
}
