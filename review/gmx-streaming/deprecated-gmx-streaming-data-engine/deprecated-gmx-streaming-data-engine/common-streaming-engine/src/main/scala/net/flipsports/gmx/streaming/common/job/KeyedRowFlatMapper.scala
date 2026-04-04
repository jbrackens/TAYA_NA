package net.flipsports.gmx.streaming.common.job

import org.apache.flink.api.java.tuple.Tuple2

trait KeyedRowFlatMapper[SOURCE, CONFIG, KEY, TARGET, BRAND] {

  def mapToTarget: (SOURCE, CONFIG, BRAND) => Seq[Tuple2[KEY, TARGET]]
}
