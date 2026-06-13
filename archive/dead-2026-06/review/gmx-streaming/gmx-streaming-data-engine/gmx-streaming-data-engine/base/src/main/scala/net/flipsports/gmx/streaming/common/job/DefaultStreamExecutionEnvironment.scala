package net.flipsports.gmx.streaming.common.job

import org.apache.flink.api.common.restartstrategy.RestartStrategies
import org.apache.flink.api.common.time.Time
import org.apache.flink.contrib.streaming.state.RocksDBStateBackend
import org.apache.flink.runtime.state.StateBackend
import org.apache.flink.streaming.api.environment.CheckpointConfig.ExternalizedCheckpointCleanup
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

object DefaultStreamExecutionEnvironment {

  private val defaultCheckpointLocation = PathUtils.localFileSystem("/data/checkpoints")

  def withRestartStrategiesAndCheckpoints(checkpointsLocation: Option[String] = None): StreamExecutionEnvironment = {
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    env.enableCheckpointing(10000)
    env.setRestartStrategy(RestartStrategies.fixedDelayRestart(10, Time.minutes(3)))
    env.getCheckpointConfig.enableExternalizedCheckpoints(ExternalizedCheckpointCleanup.DELETE_ON_CANCELLATION)
    env.getCheckpointConfig.setMinPauseBetweenCheckpoints(5000)
    env.getCheckpointConfig.setMaxConcurrentCheckpoints(1)
    env.getCheckpointConfig.setCheckpointTimeout(4000)
    val state: StateBackend = new RocksDBStateBackend(checkpointsLocation.getOrElse(defaultCheckpointLocation))
    env.setStateBackend(state)
    env
  }
}
