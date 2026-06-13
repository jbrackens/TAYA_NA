package net.flipsports.gmx.streaming.common.job.streams

import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.api.common.functions.RuntimeContext
import org.apache.flink.api.common.state.{ValueState, ValueStateDescriptor}

import java.time.Instant

trait FireTimeAwareness extends Serializable with JoinedStreamingLogLevels {

  @transient
  protected var lastFireTime: ValueState[Long] = _

  def openLastFireTime(descriptor: ValueStateDescriptor[Long] = Descriptors.lastFiringTime)
                            (implicit rc: RuntimeContext) = {
    lastFireTime = rc.getState(descriptor)
  }

  def initializeLastFireTime(): Unit = {
    val now = Instant.now().toEpochMilli
    log(logger, s"Last fireTime initialization with value $now", globalLevel)
    if (Option(lastFireTime.value()).isEmpty) lastFireTime.update(now)
  }

  def bufferTimeHasPassedSinceLastTick(tickTime: Long, bufferTime: Long = FireTimeAwareness.defaultBufferTime): Boolean = {
    val lastFiredTime = lastFireTime.value()
    (tickTime - lastFiredTime) < bufferTime
  }
}

object FireTimeAwareness {

  val defaultBufferTime = 10000

}
