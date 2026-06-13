package net.flipsports.gmx.streaming.common.job

import org.apache.flink.api.java.tuple.Tuple2

trait KeyedFilterRow[SOURCE, CONFIG, KEY, TARGET] {

  def filterTargetRow: (Tuple2[KEY, TARGET], CONFIG) => Boolean = (_, _) => true

  def filterSourceRow: (SOURCE, CONFIG) => Boolean = (_, _) => true
}
