package net.flipsports.gmx.streaming.common.job

import com.typesafe.scalalogging.LazyLogging
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

trait Logger extends LazyLogging with Serializable {

  def logInfoRow[T]: T => T = { record =>
    logger.debug(s"Consuming record ${record.toString}")
    record
  }

  def logKeyValue[Key, Value]: FlinkTuple[Key, Value] => FlinkTuple[Key, Value]= { record =>
    logger.debug(s"Consuming record key: ${record.f0.toString} value: ${record.f1.toString}")
    record
  }
}
