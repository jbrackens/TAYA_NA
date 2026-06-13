package net.flipsports.gmx.streaming.common.job.streams

import org.apache.flink.api.java.tuple.Tuple2

package object dto {

  def isValueNull[D](value: D): Boolean = {
    if (value.isInstanceOf[Tuple2[_, _]]){
      isTupleValueNull(value.asInstanceOf[Tuple2[_, _]])
    } else {
      value == null
    }
  }

  def isTupleValueNull(value: Tuple2[_, _]): Boolean = value.f1 == null

  def isOptionEmpty[D](value: Option[D]): Boolean = value.isEmpty

}
