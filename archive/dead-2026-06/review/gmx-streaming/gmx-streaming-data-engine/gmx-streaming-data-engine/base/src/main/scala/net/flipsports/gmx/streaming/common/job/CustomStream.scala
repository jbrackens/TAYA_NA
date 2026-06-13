package net.flipsports.gmx.streaming.common.job

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import org.apache.flink.api.common.{ExecutionConfig, JobExecutionResult}
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

abstract class CustomStream(args: Array[String], metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters) extends Serializable {

  implicit val executionParameters: JobExecutionParameters = JobExecutionParameters(args)

  def stream(): JobExecutionResult = {
    val env = DefaultStreamExecutionEnvironment.withRestartStrategiesAndCheckpoints(metaParameters.checkpointLocation)
    implicit val executionConfig = env.getConfig
    buildStreamTopology(env, businessMetaParameters.brand())
    env.execute(metaParameters.name)
  }

  def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit
}
