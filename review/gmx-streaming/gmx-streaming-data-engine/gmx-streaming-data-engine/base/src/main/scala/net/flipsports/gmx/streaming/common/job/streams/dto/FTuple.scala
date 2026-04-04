package net.flipsports.gmx.streaming.common.job.streams.dto

import org.apache.flink.api.java.tuple._

object FTuple {

  type FTuple1[T0] = Tuple1[T0]
  type FTuple2[T0, T1] = Tuple2[T0, T1]
  type FTuple3[T0, T1, T2] = Tuple3[T0, T1, T2]
  type FTuple4[T0, T1, T2, T3] = Tuple4[T0, T1, T2, T3]
  type FTuple5[T0, T1, T2, T3, T4] = Tuple5[T0, T1, T2, T3, T4]
  type FTuple6[T0, T1, T2, T3, T4, T5] = Tuple6[T0, T1, T2, T3, T4, T5]
  type FTuple7[T0, T1, T2, T3, T4, T5, T6] = Tuple7[T0, T1, T2, T3, T4, T5, T6]

}
