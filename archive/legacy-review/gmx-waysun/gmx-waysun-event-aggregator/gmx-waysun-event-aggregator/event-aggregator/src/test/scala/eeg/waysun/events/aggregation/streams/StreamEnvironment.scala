package eeg.waysun.events.aggregation.streams

import eeg.waysun.events.aggregation.configs.AppConfigDef
import eeg.waysun.events.aggregation.configs.AppConfigDef.ConfigurationLoader
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import scala.reflect.io.File

trait StreamEnvironment {

  def withStreamingEnvironment[R](
      f: (AppConfigDef.AppConfig, StreamExecutionEnvironment, BusinessMetaParameters, MetaParameters) => R): Unit = {
    val config = ConfigurationLoader.apply
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)
    val checkpoints = s"file://${File(".").toAbsolute.path}/target"
    val params = BusinessMetaParameters.waysun
    val metaParameters = MetaParameters("", Some(checkpoints))
    f(config, env, params, metaParameters)
  }
}
