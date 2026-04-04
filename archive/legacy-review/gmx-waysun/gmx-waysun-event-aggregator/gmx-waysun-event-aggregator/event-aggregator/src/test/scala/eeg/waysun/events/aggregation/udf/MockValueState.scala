package eeg.waysun.events.aggregation.udf

import org.apache.flink.api.common.state.ValueState

class MockValueState[A](default: A) extends ValueState[A] {
  var valueState: A = default
  override def value(): A = valueState

  override def update(value: A): Unit = {
    valueState = value
  }

  override def clear(): Unit = {
    valueState = default
  }
}
