package gmx.service.responsiblegambling.generators

import java.util.concurrent.TimeUnit

import cloudflow.flink.{ FlinkStreamlet, FlinkStreamletLogic }
import cloudflow.streamlets.avro.{ AvroInlet, AvroOutlet }
import cloudflow.streamlets.{ IntegerConfigParameter, StreamletShape }
import gmx.dataapi.internal.customer.TimeoutSet
import gmx.dataapi.internal.responsiblegambling.TimeoutFrequencyAlert
import org.apache.flink.api.common.state.{ ValueState, ValueStateDescriptor }
import org.apache.flink.configuration.Configuration
import org.apache.flink.streaming.api.functions.KeyedProcessFunction
import org.apache.flink.streaming.api.scala._
import org.apache.flink.util.Collector
import org.slf4j.LoggerFactory

class TimeoutFrequencyAlertGenerator extends FlinkStreamlet {

  val inlet  = AvroInlet[TimeoutSet]("in")
  val outlet = AvroOutlet[TimeoutFrequencyAlert]("out", _.customerId)

  override def shape(): StreamletShape = StreamletShape(inlet, outlet)

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
        val alerts: DataStream[TimeoutFrequencyAlert] = readStream(inlet)
          .keyBy(_.customerId)
          .process(new TimeOutFrequencyFunction(TargetCount.value, WindowDays.value))

        writeStream(outlet, alerts)
      }
    }
}

/**
 * We're looking for X events in the last Y days.
 *
 * Every event is stored as a timestamp -> count pair.
 *
 * @param targetCount
 * @param windowDays
 */
class TimeOutFrequencyFunction(val targetCount: Int, val windowDays: Int)
  extends KeyedProcessFunction[String, TimeoutSet, TimeoutFrequencyAlert] {

  val log = LoggerFactory.getLogger(classOf[DepositLimitChangeFunction])

  @transient var state: ValueState[AlertGeneratorState[TimeoutSet]] = null

  override def open(parameters: Configuration): Unit = {
    super.open(parameters)

    state = getRuntimeContext.getState(
      new ValueStateDescriptor[AlertGeneratorState[TimeoutSet]](
        "timeout-frequency-state",
        classOf[AlertGeneratorState[TimeoutSet]]
      )
    )
  }

  override def processElement(event: TimeoutSet,
                              ctx: KeyedProcessFunction[String, TimeoutSet, TimeoutFrequencyAlert]#Context,
                              out: Collector[TimeoutFrequencyAlert]
  ): Unit = {

    val currentState = state.value match {
      case null     => AlertGeneratorState[TimeoutSet]
      case existing => existing
    }

    val nextState = currentState + event
    val daysAgo   = event.messageOriginDateUTC - TimeUnit.DAYS.toMillis(windowDays)

    if (nextState.countEntriesAfter(daysAgo) > targetCount)
      out.collect(TimeoutFrequencyAlert(event.customerId))

    state.update(nextState.onlyEntriesAfter(daysAgo))
  }
}
