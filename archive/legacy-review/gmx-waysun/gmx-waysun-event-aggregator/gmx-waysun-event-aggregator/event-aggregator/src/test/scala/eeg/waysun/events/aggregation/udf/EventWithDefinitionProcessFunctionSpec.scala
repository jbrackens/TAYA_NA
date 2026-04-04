package eeg.waysun.events.aggregation.udf

import eeg.waysun.events.aggregation.data.ValidatedEventProvider
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner

import java.util.UUID

class EventWithDefinitionProcessFunctionSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Event occurrence" should {

    "transform event to occurrence" in {
      // given
      val objectUnderTest = new EventWithDefinitionProcessFunction()
      val companyId = UUID.randomUUID().toString

      val (validEventKey, validEventDetails) = ValidatedEventProvider.single(companyId)

      // when
      val result = objectUnderTest.map(KeyValue(validEventKey, validEventDetails))
      val key = result.key
      val value = result.value

      value.fields should have size validEventDetails.payload.size()
      // TODO this is strange as a name is not necessarily uuid; also it looks it's assigned but not used
      value.eventName shouldBe validEventDetails.getEventName
      key.projectId shouldBe companyId
      key.eventDefinitionId shouldBe validEventDetails.eventDefinitionId
    }
  }
}
