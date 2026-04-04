package net.flipsports.gmx.streaming.common.job

import org.apache.flink.api.java.tuple.Tuple2

trait KeyedRowMapper[SOURCE, CONFIG, KEY, TARGET, BRAND] {

  def mapToTarget: (SOURCE, CONFIG, BRAND) => Tuple2[KEY, TARGET]
}

