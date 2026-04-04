package eeg.waysun.events.validators.udf

import eeg.waysun.events.validators.Types.{RawWithDefinition, RawWithDefinitionKey, Validated}
import eeg.waysun.events.validators.mappers.ValidatedEventMapper
import eeg.waysun.events.validators.splits.SideEffects
import eeg.waysun.events.validators.streams.dto.ValidationFailedEvent
import eeg.waysun.events.validators.udf.EventValidationFunction._
import eeg.waysun.events.validators.validation.{ValidationResult, ValidatorFactory}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.KeyedProcessFunction
import org.apache.flink.util.Collector

class EventValidationFunction(implicit val executionParameters: JobExecutionParameters)
    extends KeyedProcessFunction[RawWithDefinitionKey.KeyType, RawWithDefinition.OutputType, Validated.Source]
    with JoinedStreamingLogLevels {

  def validate(event: RawWithDefinition.OutputType): ValidationResult = ValidatorFactory.validate(event)

  override def processElement(element: RawWithDefinition.OutputType, ctx: WriteContext, out: Output): Unit = {
    val event = element.value
    log(logger, s"Processing validation for ${ctx.getCurrentKey} - ${event.event.value}", processElementLogLevel)
    val raw = event.event
    if (!event.broadcastEvent.isRemoved) {
      val validationResult = validate(element)
      if (validationResult.status) {
        out.collect(ValidatedEventMapper.map(element))
      } else {
        val failedEvent = new Tuple2(raw.key, ValidationFailedEvent(raw.value, validationResult.errorCodes))
        ctx.output(SideEffects.failed, failedEvent)
      }

    }
    log(logger, s"Done processing validation for ${ctx.getCurrentKey} - ${event.event.value}", processElementLogLevel)
  }
}

object EventValidationFunction {

  type ProcessFunctionType =
    KeyedProcessFunction[RawWithDefinitionKey.KeyType, RawWithDefinition.OutputType, Validated.Source]

  type WriteContext =
    KeyedProcessFunction[RawWithDefinitionKey.KeyType, RawWithDefinition.OutputType, Validated.Source]#Context

  type Output = Collector[Validated.Source]
}
