package net.flipsports.gmx.streaming.common.conversion

import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple2}

object TupleOps {

  def toTuple2[X, Y](tuple: (X, Y)): FlinkTuple2[X, Y] = new FlinkTuple2[X, Y](tuple._1, tuple._2)

  def toSeqTuple2[X, Y](collection: Seq[(X, Y)]): Seq[FlinkTuple2[X, Y]] = collection.map(toTuple2)


}
