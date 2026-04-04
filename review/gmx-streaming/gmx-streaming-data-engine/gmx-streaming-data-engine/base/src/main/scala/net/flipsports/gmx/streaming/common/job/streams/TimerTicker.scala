package net.flipsports.gmx.streaming.common.job.streams

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.streaming.api.TimerService

trait TimerTicker extends Serializable with LazyLogging {

  def registerTimer[K](key: K, service: TimerService, timerTick: Long = TimerTicker.defaultTimerTick)
                   (implicit loggingLevel: JoinedStreamingLogLevels): Unit = {
    val timeTickDelay = service.currentProcessingTime() + timerTick
    log(logger, s"Registering timer tick $timeTickDelay on key: $key", loggingLevel.timerTickLogLevel)
    service.registerEventTimeTimer(timeTickDelay)
  }
}

object TimerTicker {

  val defaultTimerTick = 5000

}