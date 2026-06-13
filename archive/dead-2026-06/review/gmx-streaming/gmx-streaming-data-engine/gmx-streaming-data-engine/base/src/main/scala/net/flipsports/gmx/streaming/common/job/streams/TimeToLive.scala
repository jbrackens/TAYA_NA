package net.flipsports.gmx.streaming.common.job.streams

import org.apache.flink.api.common.state.StateTtlConfig
import org.apache.flink.api.common.time.Time

object TimeToLive {

  val twoMinutes = minutes(2)

  val halfAnHour = minutes(30)

  def minutes(minutes: Int): StateTtlConfig = StateTtlConfig
    .newBuilder(Time.minutes(minutes))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupIncrementally(10, true)
    .build
}
