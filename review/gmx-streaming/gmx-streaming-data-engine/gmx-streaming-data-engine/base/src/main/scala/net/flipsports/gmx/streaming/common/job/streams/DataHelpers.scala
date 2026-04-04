package net.flipsports.gmx.streaming.common.job.streams

import org.apache.flink.api.java.tuple

object DataHelpers {


  implicit class ToFlinkTupleFromSeq[K, V](val events: Seq[(K, V)]) {
    def asTuple: Seq[tuple.Tuple2[K, V]] = events.map(item => new tuple.Tuple2(item._1, item._2))
  }

  implicit class ToFlinkTuple[K, V](val event: (K, V)) {
    def asTuple: tuple.Tuple2[K, V] = new tuple.Tuple2(event._1, event._2)
  }

}
