package eeg.waysun.events.aggregation.udf

import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner

// TODO: pbczyuk fill up in next spring
class AggregationCandidateIdentifierSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    //    "build result" in {
    //
    //      // given
    //      val objectUnderTest = new AggregationCandidateIdentifier()
    //      val companyId = UUID.randomUUID().toString
    //      val (definitionKey, definitionDetails) = AggregationDefinitionConfigurationProvider().single(companyId)
    //      val (_, eventEnvelope) = ValidatedEventProvider.single(companyId)
    //
    //      val key =
    //        new Joining.EventIdInCompanyType(definitionKey.getCompanyId.toString, definitionDetails.getEventId.toString)
    //      val definition = State(definitionKey, definitionDetails)
    //
    //      val field =
    //        Field(name = definition.value.getAggregationFieldName.toString, fieldType = FieldType.Integer.name, value = "2")
    //
    //      val eventOccurrence = new EventOccurrence.KeyedType(
    //        EventDefinitionIdInCompany(companyId, definitionDetails.getEventId.toString),
    //        Some(
    //          DtoEventOccurrence(
    //            eventDateTime = DateFormats.nowEpochInMiliAtUtc(),
    //            eventName = eventEnvelope.getMessageType.toString,
    //            uuid = UUID.randomUUID().toString,
    //            fields = Seq(field))))
    //      // when
    //      val result = objectUnderTest.buildValueResult(key, definition, eventOccurrence).get
    //      // then
    //      result.eventDateTime shouldBe eventOccurrence.value.get.eventDateTime
    //      result.messageType shouldBe eventEnvelope.getMessageType
    //      result.companyId shouldBe companyId
    //      result.uuid shouldBe eventOccurrence.value.get.uuid
    //      result.aggregationDefinitionRuleId shouldBe definitionKey.getRuleId
    //      result.eventDefinitionRuleId shouldBe definitionDetails.getEventId
    //      result.aggregationFieldName shouldBe definitionDetails.getAggregationFieldName
    //      result.aggregationFieldValue shouldBe field.value
    //      result.aggregationFieldType shouldBe field.fieldType
    //      result.aggregationGroupByFieldName shouldBe definition.value.getAggregationGroupByFieldName
    //      result.aggregationGroupByFieldValue shouldBe field.value
    //      result.intervalType shouldBe definition.value.getResetFrequency.getIntervalType.name()
    //      result.intervalLength shouldBe definition.value.getResetFrequency.getIntervalDetails.getLength
    //      result.windowStartDateTime shouldBe definition.value.getResetFrequency.getWindowStartDateUTC
    //      result.windowCountLimit shouldBe None
    //      result.count shouldBe 1
    //      result.min shouldBe field.value.toFloat
    //      result.max shouldBe field.value.toFloat
    //      result.sum shouldBe field.value.toFloat
    //      result.custom shouldBe "2"
    //    }
  }
}
