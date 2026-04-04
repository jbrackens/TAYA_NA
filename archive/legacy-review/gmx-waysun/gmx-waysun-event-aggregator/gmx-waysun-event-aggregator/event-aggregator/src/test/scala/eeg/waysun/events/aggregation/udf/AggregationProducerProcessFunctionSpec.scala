package eeg.waysun.events.aggregation.udf

import eeg.waysun.events.aggregation.Types.AggregationResult.KeyType
import eeg.waysun.events.aggregation.Types.{AggregationOccurrence, AggregationResult}
import eeg.waysun.events.aggregation.configs.AppConfigDef.{AppConfig, ConfigurationLoader}
import eeg.waysun.events.aggregation.data.{AggregationOccurrenceProvider, AggregationResultProvider}
import eeg.waysun.events.aggregation.streams.dto.Window
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.configuration.Configuration
import org.apache.flink.util.Collector
import stella.dataapi.aggregation.AggregationValues

import java.time.Instant
import scala.concurrent.Promise

class AggregationProducerProcessFunctionSpec extends StreamingTestBase with FlinkJobsTestRunner {

  val configuration: AppConfig = ConfigurationLoader.apply

  implicit val jobExecutionParameters: JobExecutionParameters = JobExecutionParameters(Array())

  import AggregationProducerProcessFunctionSpec._
  "AggregationProducerProcessFunction.pushAndClear" should {
    "push all the events in the cache and clear the cache" in {
      // given
      val projectId = "projectId"
      val aggregationDefinitionRuleId = "aggregationDefinitionRuleId"
      val aggregationGroupByFieldValue = "aggregationGroupByFieldValue"
      val aggregationOccurrence: AggregationOccurrence.KeyedType = AggregationOccurrenceProvider.keyed(
        AggregationOccurrenceProvider.Parameters(
          aggregationDefinitionRuleId = Some(aggregationDefinitionRuleId),
          aggregationGroupByFieldValue = Some(aggregationGroupByFieldValue),
          projectId = projectId,
          userId = "userId",
          eventName = "sample-event"))
      val key: KeyType = AggregationResultProvider.key(
        AggregationResultProvider.Parameters(
          projectId = projectId,
          aggregationDefinitionRuleId = Some(aggregationDefinitionRuleId),
          aggregationGroupByFieldValue = Some(aggregationGroupByFieldValue)))

      val objectUnderTest =
        new AggregationProducerProcessFunction(configuration) {
          override def open(parameters: Configuration): Unit = {
            aggregationState = new MockInternalMapState[Window, AggregationResult.KeyedType]()
          }
        }
      objectUnderTest.open(new Configuration())

      // when
      val out = EventCollector.apply
      objectUnderTest.processElement(aggregationOccurrence, null, out)
      // then
      val expectedOutput: AggregationResult.KeyedType =
        new AggregationResult.KeyedType(
          key,
          new stella.dataapi.aggregation.AggregationResult(
            objectUnderTest.calculateWindow(aggregationOccurrence).startDate.toEpochSecond * 1000,
            objectUnderTest.calculateWindow(aggregationOccurrence).endDate.toEpochSecond * 1000,
            new AggregationValues(0, 0, 1, 0, "custom")))
      out.list shouldBe List(expectedOutput)
    }

    "pushAndClear: createAggregate|updateAggregate|aggregationState" in {
      // given
      val aggregationStateMock: MockInternalMapState[Window, AggregationResult.KeyedType] =
        new MockInternalMapState[Window, AggregationResult.KeyedType]()

      val `called createAggregate`: Promise[Unit] = Promise[Unit]()
      val `called updateAggregate`: Promise[Unit] = Promise[Unit]()

      val objectUnderTest =
        new AggregationProducerProcessFunction(configuration) {
          override protected def createAggregate(
              keyType: KeyType,
              source: AggregationOccurrence.KeyedType,
              window: Window): AggregationResult.KeyedType = {
            `called createAggregate`.success(())
            super.createAggregate(keyType, source, window)
          }

          override protected def updateAggregate(
              key: KeyType,
              source: AggregationOccurrence.KeyedType,
              instance: AggregationResult.KeyedType): AggregationResult.KeyedType = {
            `called updateAggregate`.success(())
            super.updateAggregate(key, source, instance)
          }

          override def open(parameters: Configuration): Unit = {
            aggregationState = aggregationStateMock
          }
        }
      objectUnderTest.open(new Configuration())

      val projectId = "projectId"
      object firstAggregationOcurrence {
        val eventDateTime = Instant.now()
        val parameters = AggregationOccurrenceProvider.Parameters(
          eventDateTime = Some(eventDateTime),
          windowStartDateTime = Some(Instant.now().minusSeconds(60)),
          projectId = projectId,
          userId = "test-user",
          eventName = "test-event")
        val aggregationOccurrence: AggregationOccurrence.KeyedType = AggregationOccurrenceProvider.keyed(parameters)
      }
      val window: Window = objectUnderTest.calculateWindow(firstAggregationOcurrence.aggregationOccurrence)

      object `first aggregation result` {
        val parameters = AggregationResultProvider.Parameters(
          projectId = projectId,
          windowRangeStartUTC = Some(window.start),
          windowRangeEndUTC = Some(window.end))
        val aggregationResult =
          AggregationResultProvider.source(parameters)
      }

      // then
      aggregationStateMock.api.scala.values() shouldBe Seq.empty

      // when
      val out = EventCollector.apply
      objectUnderTest.processElement(firstAggregationOcurrence.aggregationOccurrence, null, out)
      // then
      `called createAggregate`.isCompleted shouldBe true
      `called updateAggregate`.isCompleted shouldBe false
      aggregationStateMock.api.scala.values() shouldBe Seq(`first aggregation result`.aggregationResult)

      // when
      objectUnderTest.processElement(firstAggregationOcurrence.aggregationOccurrence, null, out)
      // then
      `called updateAggregate`.isCompleted shouldBe true
      aggregationStateMock.api.scala.values() shouldBe Seq(
        AggregationResultProvider.source(
          `first aggregation result`.parameters.withWindow(window.start, window.end).withCount(2)))
    }

    "updateAggregationValues" in {
      // given
      val objectUnderTest = new AggregationProducerProcessFunction(configuration)

      val aggregationOccurrence: AggregationOccurrence.ValueType =
        AggregationOccurrenceProvider.value(
          AggregationOccurrenceProvider.Parameters("super-user", "projectId", "test-event"))

      // when
      val firstAggregationOccurrence =
        aggregationOccurrence.copy(count = 1, min = 1, max = 10, sum = 0, custom = "first")
      val result = objectUnderTest.updateAggregationValues(None, firstAggregationOccurrence)
      // then
      result.count shouldBe 1
      result.sum shouldBe 0
      result.max shouldBe 10
      result.min shouldBe 1
      result.custom shouldBe "first"

      // when
      val secondAggregationOccurrence =
        aggregationOccurrence.copy(count = 10, min = 0, max = 100, sum = 5, custom = "second")
      val result2 = objectUnderTest.updateAggregationValues(Some(result), secondAggregationOccurrence)
      // then
      result2.count shouldBe 11
      result2.sum shouldBe 5
      result2.max shouldBe 100
      result2.min shouldBe 0
      result2.custom shouldBe "second"
    }

  }

}

object AggregationProducerProcessFunctionSpec {
  object EventCollector {
    def apply: Collector[AggregationResult.KeyedType] with ListCollector =
      new Collector[AggregationResult.KeyedType] with ListCollector {
        override def collect(record: AggregationResult.KeyedType): Unit =
          list = list :+ record
        override def close(): Unit = ()
      }

    trait ListCollector { var list: List[AggregationResult.KeyedType] = List() }
  }
}
