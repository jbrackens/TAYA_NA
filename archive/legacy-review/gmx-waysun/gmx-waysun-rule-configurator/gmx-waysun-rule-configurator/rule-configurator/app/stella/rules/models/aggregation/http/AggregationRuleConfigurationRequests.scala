package stella.rules.models.aggregation.http

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.jdk.CollectionConverters._

import play.api.libs.json.Json
import play.api.libs.json.OFormat
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.core.Clock
import stella.common.http.json.JsonFormats.offsetDateTimeFormat
import stella.dataapi.{aggregation => dataapi}

import stella.rules.models.ConstructorRequirementsUtils.requireNonEmptyAndNonBlankWithLengthLimit
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId._
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.Ids.EventConfigurationEventId._
import stella.rules.models.aggregation.AggregationConditionType
import stella.rules.models.aggregation.AggregationRuleConfigurationEntity
import stella.rules.models.aggregation.AggregationType
import stella.rules.models.aggregation.IntervalType
import stella.rules.models.event.http.EventField.eventFieldDescription
import stella.rules.models.event.http.EventField.optionalEventFieldDescription
import stella.rules.models.event.http.EventField.validateEventField

final case class CreateAggregationRuleConfigurationRequest(
    name: String,
    description: String,
    eventConfigurationId: EventConfigurationEventId,
    resetFrequency: CreateRequestResetFrequency,
    aggregationType: AggregationType,
    aggregationFieldName: String,
    aggregationGroupByFieldName: Option[String],
    aggregationConditions: List[AggregationRuleCondition]) {
  import CreateAggregationRuleConfigurationRequest._

  requireNonEmptyAndNonBlankWithLengthLimit(
    "Aggregation rule configuration name",
    name,
    maxAggregationRuleConfigNameLength)

  validateEventField("Aggregation field name", aggregationFieldName)

  aggregationGroupByFieldName.foreach { name =>
    validateEventField("Aggregation group by field name", name)
  }
}

object CreateAggregationRuleConfigurationRequest {

  private val maxAggregationRuleConfigNameLength = 50

  implicit def createAggregationRuleConfigurationRequestFormat(implicit
      clock: Clock): RootJsonFormat[CreateAggregationRuleConfigurationRequest] = jsonFormat8(
    CreateAggregationRuleConfigurationRequest.apply)

  implicit def createAggregationRuleConfigurationRequestPlayFormat(implicit
      clock: Clock): OFormat[CreateAggregationRuleConfigurationRequest] =
    Json.format[CreateAggregationRuleConfigurationRequest]

  implicit lazy val createAggregationRuleConfigurationRequestSchema: Schema[CreateAggregationRuleConfigurationRequest] =
    Schema
      .derived[CreateAggregationRuleConfigurationRequest]
      .modify(_.name)(_.description(
        s"A non-empty, non-blank display name not longer than $maxAggregationRuleConfigNameLength characters")
        .encodedExample("hidden-chests-discoverer-aggregation"))
      .modify(_.description)(_.encodedExample("Aggregates for users who discover many hidden chests"))
      .modify(_.aggregationFieldName)(_.description(eventFieldDescription).encodedExample("hidden_chests_found"))
      .modify(_.aggregationGroupByFieldName)(_.description(optionalEventFieldDescription).encodedExample("user_id"))
}

final case class UpdateAggregationRuleConfigurationRequest(isActive: Option[Boolean], description: Option[String]) {
  require(isActive.nonEmpty || description.nonEmpty, "No data to update specified")

  def containsChanges(entity: AggregationRuleConfigurationEntity): Boolean =
    isActive.exists(_ != entity.isActive) || description.exists(_ != entity.description)
}

object UpdateAggregationRuleConfigurationRequest {
  implicit lazy val updateAggregationRuleConfigurationRequestFormat
      : RootJsonFormat[UpdateAggregationRuleConfigurationRequest] = jsonFormat2(
    UpdateAggregationRuleConfigurationRequest.apply)

  implicit lazy val updateAggregationRuleConfigurationRequestPlayFormat
      : OFormat[UpdateAggregationRuleConfigurationRequest] =
    Json.format[UpdateAggregationRuleConfigurationRequest]

  implicit lazy val updateAggregationRuleConfigurationRequestSchema: Schema[UpdateAggregationRuleConfigurationRequest] =
    Schema
      .derived[UpdateAggregationRuleConfigurationRequest]
      .modify(_.isActive)(_.description("New isActive value"))
      .modify(_.description)(_.description("New description value"))
}

final case class AggregationRuleConfiguration(
    aggregationRuleId: AggregationRuleConfigurationRuleId,
    name: String,
    description: String,
    eventConfigurationId: EventConfigurationEventId,
    resetFrequency: ResetFrequency,
    aggregationType: AggregationType,
    aggregationFieldName: String,
    aggregationGroupByFieldName: Option[String],
    aggregationConditions: List[AggregationRuleCondition],
    isActive: Boolean,
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toDataApi: dataapi.AggregationRuleConfiguration =
    dataapi.AggregationRuleConfiguration
      .newBuilder()
      .setAggregationFieldName(aggregationFieldName)
      .setAggregationGroupByFieldName(aggregationGroupByFieldName.orNull)
      .setAggregationType(dataapi.AggregationType.valueOf(aggregationType.entryName))
      .setResetFrequency(resetFrequency.toDataApi)
      .setAggregationConditions(aggregationConditions.map(_.toDataApiAggregationCondition).asJava)
      .build()
}

object AggregationRuleConfiguration {
  implicit lazy val aggregationRuleConfigurationFormat: RootJsonFormat[AggregationRuleConfiguration] = jsonFormat12(
    AggregationRuleConfiguration.apply)

  implicit lazy val aggregationRuleConfigurationSchema: Schema[AggregationRuleConfiguration] = {
    // Magnolia can't find this implicit so we need to help a compiler a bit
    Schema
      .derived[AggregationRuleConfiguration]
      .modify(_.name)(_.encodedExample("hidden-chests-discoverer-aggregation"))
      .modify(_.description)(_.encodedExample("Aggregation configuration for users who discover many hidden chests"))
      .modify(_.aggregationFieldName)(_.encodedExample("hidden_chests_found"))
      .modify(_.aggregationGroupByFieldName)(_.encodedExample("user_id"))
  }
}

final case class IntervalDetails(length: Int, windowCountLimit: Option[Int]) {
  import IntervalDetails._

  require(length > 0, s"An interval length should be a positive integer but was $length")

  windowCountLimit.foreach(limit =>
    require(
      limit > 0 && limit <= maxWindowCountLimit,
      s"windowCountLimit, when specified, should be between 1 and $maxWindowCountLimit but was $limit"))

  def toDataApi: dataapi.IntervalDetails =
    dataapi.IntervalDetails
      .newBuilder()
      .setLength(length)
      .setWindowCountLimit(windowCountLimit.map(Integer.valueOf).orNull)
      .build()
}

object IntervalDetails {
  private val maxWindowCountLimit = 400
  // we just want to prevent users from specifying such big ranges which can't be handled correctly
  private[http] val maxIntervalYears = 50

  implicit lazy val intervalDetailsFormat: RootJsonFormat[IntervalDetails] = jsonFormat2(IntervalDetails.apply)

  implicit lazy val intervalDetailsPlayFormat: OFormat[IntervalDetails] = Json.format[IntervalDetails]

  implicit lazy val intervalDetailsSchema: Schema[IntervalDetails] = Schema
    .derived[IntervalDetails]
    .modify(_.length)(_.description(s"A positive integer. When set, an interval can't exceed $maxIntervalYears years."))
    .modify(_.windowCountLimit)(
      _.description(s"An optional limit of the windows to compute. A value between 1 and $maxWindowCountLimit"))
}

final case class ResetFrequency(
    interval: IntervalType,
    windowStartDateUTC: OffsetDateTime,
    intervalDetails: Option[IntervalDetails]) {

  def toCreateRequestResetFrequency(implicit clock: Clock): CreateRequestResetFrequency =
    CreateRequestResetFrequency(interval, Some(windowStartDateUTC), intervalDetails)

  def toDataApi: dataapi.AggregationInterval =
    dataapi.AggregationInterval
      .newBuilder()
      .setIntervalType(dataapi.IntervalType.valueOf(interval.entryName))
      .setWindowStartDateUTC(windowStartDateUTC.toInstant.toEpochMilli)
      .setIntervalDetails(intervalDetails.getOrElse(ResetFrequency.defaultIntervalDetails).toDataApi)
      .build()
}

object ResetFrequency {
  implicit lazy val resetFrequencyFormat: RootJsonFormat[ResetFrequency] = jsonFormat3(ResetFrequency.apply)

  implicit lazy val resetFrequencyPlayFormat: OFormat[ResetFrequency] = Json.format[ResetFrequency]

  implicit lazy val resetFrequencySchema: Schema[ResetFrequency] = Schema.derived[ResetFrequency]

  // in AVRO interval details is nullable (as for now) but later on we agreed that we'll set a default value
  // (while still having an empty value in the database)
  private val defaultIntervalDetails = IntervalDetails(length = Int.MaxValue, windowCountLimit = None)
}

final case class CreateRequestResetFrequency(
    interval: IntervalType,
    windowStartDateUTC: Option[OffsetDateTime],
    intervalDetails: Option[IntervalDetails])(private implicit val clock: Clock) {
  import CreateRequestResetFrequency._

  checkInterval(interval, intervalDetails)

  windowStartDateUTC.foreach { dateTime =>
    require(dateTime.getOffset == ZoneOffset.UTC, s"windowStartDateUTC '$dateTime' should have zone offset UTC")

    require(
      dateTime.isAfter(minWindowStartDate) || dateTime.isEqual(minWindowStartDate),
      s"windowStartDateUTC '$dateTime' can't be earlier than '$minWindowStartDate'")
  }
  private val windowStartDateUTCValue: OffsetDateTime =
    windowStartDateUTC.getOrElse(asOffsetDateTimeTruncated(interval, clock.currentUtcOffsetDateTime()))

  def getWindowStartDateUTCValue: OffsetDateTime = windowStartDateUTCValue
}

object CreateRequestResetFrequency {

  private val minWindowStartDate = OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)

  implicit def createRequestResetFrequencyFormat(implicit clock: Clock): RootJsonFormat[CreateRequestResetFrequency] =
    jsonFormat(CreateRequestResetFrequency.apply, "interval", "windowStartDateUTC", "intervalDetails")

  implicit def createRequestResetFrequencyPlayFormat(implicit clock: Clock): OFormat[CreateRequestResetFrequency] =
    Json.format[CreateRequestResetFrequency]

  implicit lazy val createRequestResetFrequencySchema: Schema[CreateRequestResetFrequency] = Schema
    .derived[CreateRequestResetFrequency]
    .modify(_.intervalDetails)(
      _.description(s"Must be set for all interval types except ${IntervalType.Never.entryName}"))
    .modify(_.windowStartDateUTC)(
      _.description(
        "A reference UTC date when the system should start to compute the windows. Can't be earlier than " +
        s"$minWindowStartDate. By default it's set to a current date truncated according to the chosen interval." +
        s"E.g. for '${IntervalType.Months.entryName}' it's a beginning of a current month, for " +
        s"'${IntervalType.Hours.entryName}' a beginning of a current hour and so on. For " +
        s"${IntervalType.Never.entryName} it's the same as for ${IntervalType.Minutes.entryName}"))

  private def checkInterval(interval: IntervalType, intervalDetails: Option[IntervalDetails])(implicit
      clock: Clock): Unit = {
    (interval, intervalDetails) match {
      case (IntervalType.Never, _) =>
        require(intervalDetails.isEmpty, s"Interval details for interval type ${interval.entryName} should be empty")
      case (_, None) =>
        throw new IllegalArgumentException(
          s"Interval details for interval type ${interval.entryName} should be specified")
      case (_, Some(details)) =>
        ensureIntervalIsNotTooWide(interval, details.length)
    }
  }

  private def ensureIntervalIsNotTooWide(interval: IntervalType, length: Int)(implicit clock: Clock): Unit = {
    val current = clock.currentUtcOffsetDateTime()
    val maxAllowedDate = current.plusYears(IntervalDetails.maxIntervalYears)
    val currentIntervalEnd = interval match {
      case IntervalType.Minutes => current.plusMinutes(length)
      case IntervalType.Hours   => current.plusHours(length)
      case IntervalType.Days    => current.plusDays(length)
      case IntervalType.Months  => current.plusMonths(length)
      case IntervalType.Never   => current // just some dummy value, this case should not happen
    }
    require(
      currentIntervalEnd.compareTo(maxAllowedDate) <= 0,
      s"An interval other than ${IntervalType.Never.entryName} " +
      s"can't be longer than ${IntervalDetails.maxIntervalYears} years")
  }

  def asOffsetDateTimeTruncated(interval: IntervalType, date: OffsetDateTime): OffsetDateTime = {
    interval match {
      case IntervalType.Days =>
        OffsetDateTime.of(date.getYear, date.getMonthValue, date.getDayOfMonth, 0, 0, 0, 0, ZoneOffset.UTC)
      case IntervalType.Hours =>
        OffsetDateTime.of(date.getYear, date.getMonthValue, date.getDayOfMonth, date.getHour, 0, 0, 0, ZoneOffset.UTC)
      case IntervalType.Never =>
        OffsetDateTime.of(date.getYear, date.getMonthValue, date.getDayOfMonth, date.getHour, 0, 0, 0, ZoneOffset.UTC)
      case IntervalType.Months =>
        OffsetDateTime.of(date.getYear, date.getMonthValue, 1, 0, 0, 0, 0, ZoneOffset.UTC)
      case IntervalType.Minutes | IntervalType.Never =>
        OffsetDateTime.of(
          date.getYear,
          date.getMonthValue,
          date.getDayOfMonth,
          date.getHour,
          date.getMinute,
          0,
          0,
          ZoneOffset.UTC)
    }
  }
}

final case class AggregationRuleCondition(
    eventFieldName: String,
    conditionType: AggregationConditionType,
    value: Option[String]) {
  import AggregationRuleCondition._

  validateEventField("Event field name", eventFieldName)

  require(
    conditionType != AggregationConditionType.Nn || value.isEmpty,
    s"A value for aggregation type ${conditionType.entryName} should be empty")

  require(
    conditionType == AggregationConditionType.Nn || value.exists(v =>
      !v.isBlank && v.length <= maxAggregationRuleConditionValueLength),
    s"A value for aggregation type ${conditionType.entryName} must be specified, be non-blank and have at most $maxAggregationRuleConditionValueLength characters")

  def toDataApiAggregationCondition: dataapi.AggregationCondition =
    dataapi.AggregationCondition
      .newBuilder()
      .setEventFieldName(eventFieldName)
      .setConditionType(dataapi.ConditionType.valueOf(conditionType.entryName))
      .setValue(value.orNull)
      .build()

}

object AggregationRuleCondition {
  private val maxAggregationRuleConditionValueLength = 250

  implicit lazy val aggregationRuleConditionFormat: RootJsonFormat[AggregationRuleCondition] = jsonFormat3(
    AggregationRuleCondition.apply)

  implicit lazy val aggregationRuleConditionPlayFormat: OFormat[AggregationRuleCondition] =
    Json.format[AggregationRuleCondition]

  implicit lazy val aggregationRuleConditionSchema: Schema[AggregationRuleCondition] =
    Schema
      .derived[AggregationRuleCondition]
      .modify(_.eventFieldName)(_.description(eventFieldDescription).encodedExample("hidden_chests_found"))
      .modify(_.value)(
        _.description(
          s"A value used in the condition, not longer than $maxAggregationRuleConditionValueLength characters. " +
          s"Must be set for all conditions except ${AggregationConditionType.Nn.entryName}").encodedExample("20"))
}
