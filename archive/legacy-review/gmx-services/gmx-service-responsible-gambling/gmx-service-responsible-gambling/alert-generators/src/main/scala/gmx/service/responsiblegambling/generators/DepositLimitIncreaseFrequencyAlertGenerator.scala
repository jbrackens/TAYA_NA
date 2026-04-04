package gmx.service.responsiblegambling.generators

import java.util.concurrent.TimeUnit

import cloudflow.flink.{ FlinkStreamlet, FlinkStreamletLogic }
import cloudflow.streamlets.avro.{ AvroInlet, AvroOutlet }
import cloudflow.streamlets.{ IntegerConfigParameter, StreamletShape }
import gmx.dataapi.internal.customer.DepositLimitSet
import gmx.dataapi.internal.responsiblegambling.DepositLimitIncreaseFrequencyAlert
import org.apache.flink.api.common.state.{ ValueState, ValueStateDescriptor }
import org.apache.flink.configuration.Configuration
import org.apache.flink.streaming.api.functions.KeyedProcessFunction
import org.apache.flink.streaming.api.scala._
import org.apache.flink.util.Collector

class DepositLimitIncreaseFrequencyAlertGenerator extends FlinkStreamlet {

  val in  = AvroInlet[DepositLimitSet]("in")
  val out = AvroOutlet[DepositLimitIncreaseFrequencyAlert]("out", _.customerId)

  override def shape(): StreamletShape = StreamletShape(in, out)

  val TargetCount = IntegerConfigParameter(
    "target-count",
    "The number of events to accumulate over the period of `window-size-days` that triggers an alert to be dispatched",
    Some(3)
  )

  val WindowDays = IntegerConfigParameter(
    "window-size-days",
    "The number of days over which we count events to decide if we should dispatch an alert",
    Some(28)
  )

  override def configParameters = Vector(TargetCount, WindowDays)

  override protected def createLogic(): FlinkStreamletLogic =
    new FlinkStreamletLogic() {

      override def buildExecutionGraph(): Unit = {
        val alerts = readStream(in)
          .keyBy(_.customerId)
          .process(new DepositLimitChangeFunction(TargetCount.value, WindowDays.value))

        writeStream(out, alerts)
      }
    }
}

/**
 * We're looking for X events where the deposit limit has increased in the last Y days.
 *
 * @param targetCount
 * @param windowDays
 */
class DepositLimitChangeFunction(val targetCount: Int, val windowDays: Int)
  extends KeyedProcessFunction[String, DepositLimitSet, DepositLimitIncreaseFrequencyAlert] {

  @transient var state: ValueState[AlertGeneratorState[DepositLimitSet]] = null

  override def open(parameters: Configuration): Unit = {
    super.open(parameters)

    state = getRuntimeContext.getState(
      new ValueStateDescriptor[AlertGeneratorState[DepositLimitSet]](
        "deposit-limit-increase-state",
        classOf[AlertGeneratorState[DepositLimitSet]]
      )
    )
  }

  override def processElement(
      event: DepositLimitSet,
      ctx: KeyedProcessFunction[String, DepositLimitSet, DepositLimitIncreaseFrequencyAlert]#Context,
      out: Collector[DepositLimitIncreaseFrequencyAlert]
  ): Unit = {

    // The state wrapper is created by Flink when this function's `open()` method is called.
    // We have to populate the wrapper with a `value`.
    val currentState = state.value match {
      case null     => AlertGeneratorState[DepositLimitSet]
      case existing => existing
    }

    // If the user has decreased their deposit limit then we drop
    // all previous events, otherwise we add this event to the head of the list.
    val nextState =
      if (currentState.head.map(s => BigDecimal(s.limit)).getOrElse(BigDecimal(0)) <= BigDecimal(event.limit))
        currentState + event
      else
        AlertGeneratorState[DepositLimitSet](event)

    val daysAgo = event.messageOriginDateUTC - TimeUnit.DAYS.toMillis(windowDays)

    // With enough increasing deposit limit events within the time
    // window we'll dispatch the event.
    if (nextState.countEntriesAfter(daysAgo) > targetCount)
      out.collect(DepositLimitIncreaseFrequencyAlert(event.customerId))

    // We only trim to the time window, we don't drop all the events
    // This way, if a user increases their deposit limit again
    // another alert will be triggered immediately, this will happen
    // every time they increase their deposit limit until they've
    // waiting for longer than the time window before another increase.
    state.update(nextState.onlyEntriesAfter(daysAgo))
  }
}
