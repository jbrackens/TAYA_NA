package net.flipsports.gmx.streaming.common.job.stats

import org.apache.flink.api.common.functions.RichMapFunction
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.streaming.api.scala.DataStream

object Metrics {

  def apply[R: TypeInformation](dataStream: DataStream[R]) = definition[R].foldRight(dataStream)(addMetric)

  def definition[R: TypeInformation]: Seq[RichMapFunction[R, R]] = Seq(
    new AverageThroughputMeter[R],
    new LongValuesHistogram[R],
    new MessageCounter[R])

  private def addMetric[R: TypeInformation]: (RichMapFunction[R, R], DataStream[R]) => DataStream[R] = (metric, stream) => {
    stream.map(metric)
  }

}
