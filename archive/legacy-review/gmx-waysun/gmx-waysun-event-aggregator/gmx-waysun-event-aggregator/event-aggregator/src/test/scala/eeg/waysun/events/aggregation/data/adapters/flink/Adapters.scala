package eeg.waysun.events.aggregation.data.adapters.flink

import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue

object Adapters {
  object Flink {

    def toTuple[A, B](a: A, b: B) = new org.apache.flink.api.java.tuple.Tuple2[A, B](a, b)

    def toKeyed[A, B](a: A, b: B): KeyValue[A, B] = KeyValue.fromTuple(Tuple2(a, b))
  }
}
