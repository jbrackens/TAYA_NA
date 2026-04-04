package net.flipsports.gmx.streaming.common.functions


import com.typesafe.scalalogging.LazyLogging
import org.apache.flink.api.common.functions.RichMapFunction
import org.apache.flink.api.java.tuple.Tuple2

object RowLogger {

  private def isNull[S](record: S) = record == null

  private def safeHashCode[S](record : S) = {
    if (isNull(record)) {
      null
    } else {
      record.hashCode
    }
  }

  abstract protected class RichLoggerFunction[IN, OUT] extends RichMapFunction[IN, OUT] with LazyLogging with Serializable {
    override def map(record: IN): OUT = {
      if (isNull(record)) {
        return null.asInstanceOf[OUT]
      }

      logRecord(record)
    }
    
    def logRecord(record: IN): OUT
  }

  class RowValueLogger[S] extends RichLoggerFunction[S, S] {

    override def logRecord(record: S): S = {
      logger.whenDebugEnabled(
        record match {
          case tuple: Tuple2[_, _] => logTuple(tuple.f0, tuple.f1)
          case single => logValue(single)
        }
      )
      record
    }

    private def logTuple(key: Any, value: Any): Unit =
      logger.debug(s"Performing record with fingerprint: ${safeHashCode(value)}${System.lineSeparator()}" +
        s"Key [${key.getClass.getSimpleName}]: ${key.toString}${System.lineSeparator()}" +
        s"Value [${value.getClass.getSimpleName}]: ${value.toString}")

    private def logValue(value: Any): Unit =
      logger.debug(s"Performing record with fingerprint: ${safeHashCode(value)}${System.lineSeparator()}" +
        s"Value [${value.getClass.getSimpleName}]: ${value.toString}")
  }

  def apply[S] = new RowValueLogger[S]

}



