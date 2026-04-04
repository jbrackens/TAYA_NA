package eeg.waysun.events.validators.udf

import eeg.waysun.events.validators.Types
import eeg.waysun.events.validators.Types.RawWithDefinition.{OutputType => Result}
import eeg.waysun.events.validators.data.{DefinitionDataProvider, RawDataProvider, _}
import eeg.waysun.events.validators.splits.Descriptors
import eeg.waysun.events.validators.udf.EventsWithRulesKeyFunction._
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.state.Collected
import org.apache.flink.api.common.state.BroadcastState
import org.apache.flink.streaming.api.TimerService
import org.mockito.Mockito
import org.mockito.Mockito.when

import scala.collection.JavaConverters.asJavaIterableConverter

class EventsWithRulesKeyFunctionSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Keyed Processing function" should {

    implicit val extractors = JobExecutionParameters(Array())

    "Cache event on its arrival" in {
      //given
      val collectorMock = new Collected.CollectedDef[Result]()
      val contextMock = Mockito.mock(classOf[ReadContext])
      val timerServiceMock = Mockito.mock(classOf[TimerService])
      val definitionMock = Mockito.mock(classOf[BroadCastedState])

      val raw = KeyValue.fromTuple(RawDataProvider.single.toInternalKey())
      val key = new Types.Joining.KeyType(raw.key.projectId, raw.key.userId)

      when(contextMock.getCurrentKey).thenReturn(key)
      when(contextMock.timerService()).thenReturn(timerServiceMock)
      when(contextMock.getBroadcastState(Descriptors.definitions)).thenReturn(definitionMock)
      val iterator = Seq().asJava
        .asInstanceOf[java.lang.Iterable[java.util.Map.Entry[Types.Definition.KeyType, Types.Definition.KeyedType]]]
      when(definitionMock.immutableEntries()).thenReturn(iterator)

      //when
      new EventsWithRulesKeyFunction().processElement(raw, contextMock, collectorMock.asInstanceOf[Output])

      // then
      collectorMock.result should have size 0

    }

    "Cache definition on its arrival" in {

      //given
      val collectorMock = new Collected.CollectedDef[Result]()
      val contextMock = Mockito.mock(classOf[WriteContext])
      val definitionMock = Mockito.mock(classOf[BroadcastState[Types.Definition.KeyType, Types.Definition.KeyedType]])

      val definition = KeyValue.fromTuple(DefinitionDataProvider.single.toInternalKey())

      when(contextMock.getBroadcastState(Descriptors.definitions)).thenReturn(definitionMock)

      //when
      new EventsWithRulesKeyFunction()
        .processBroadcastElement(definition, contextMock, collectorMock.asInstanceOf[Output])

      // then
      Mockito.verify(definitionMock).put(definition.key, definition)
    }

  }

}
