package eeg.waysun.events.validators.udf

import eeg.waysun.events.validators.Types.RawWithDefinition.{ValueType, OutputType => Event}
import eeg.waysun.events.validators.Types.{RawWithDefinition, Validated}
import eeg.waysun.events.validators.data.{DefinitionDataProvider, RawDataProvider, _}
import eeg.waysun.events.validators.udf.EventValidationFunction._
import eeg.waysun.events.validators.validation.{ErrorCodes, ValidationResult}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.job.streams.dto.{KeyValue, KeyValueOpt}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.state.Collected
import org.mockito.Mockito

class EventValidationFunctionSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Event validator" should {
    implicit val executionParameters = JobExecutionParameters(Array())
    "collect valid messages" in {
      //given
      val collectorMock = new Collected.CollectedDef[Validated.Source]()
      val contextMock = Mockito.mock(classOf[WriteContext])

      val raw = KeyValue.fromTuple(RawDataProvider.single.toInternalKey)
      val definition = KeyValueOpt.fromTuple(DefinitionDataProvider.single.toInternalKey())
      val element = new ValueType(event = raw, broadcastEvent = definition)
      //when
      new EventValidationFunction() {
        override def validate(event: RawWithDefinition.OutputType): ValidationResult = ValidationResult.succeeded()
      }.processElement(new Event(null, element), contextMock, collectorMock)

      // then
      collectorMock.result should have size 1
    }

    "not collect invalid messages" in {
      //given
      val collectorMock = new Collected.CollectedDef[Validated.Source]()
      val contextMock = Mockito.mock(classOf[WriteContext])

      val raw = KeyValue.fromTuple(RawDataProvider.single.toInternalKey())
      val definition = KeyValueOpt.fromTuple(DefinitionDataProvider.single.toInternalKey())

      val element = new ValueType(event = raw, broadcastEvent = definition)
      //when
      new EventValidationFunction() {
        override def validate(event: Event): ValidationResult = ValidationResult.failure(ErrorCodes.IncorrectValue)
      }.processElement(new Event(null, element), contextMock, collectorMock)

      // then
      collectorMock.result should have size 0
    }
  }

}
