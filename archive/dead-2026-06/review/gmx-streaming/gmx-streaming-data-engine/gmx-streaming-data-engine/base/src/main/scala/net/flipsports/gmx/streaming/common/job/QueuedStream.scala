package net.flipsports.gmx.streaming.common.job

import net.flipsports.gmx.streaming.common.functions.RowLogger
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.stats.Metrics
import org.apache.flink.api.common.{ExecutionConfig, JobExecutionResult}
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

abstract class QueuedStream[S, T](metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters)
                                 (implicit sourceTypeInformation: TypeInformation[S], targetTypeInformation: TypeInformation[T])
  extends Serializable {

  type INPUT = S
  type OUTPUT = T

  def stream(): JobExecutionResult = {
    val env = DefaultStreamExecutionEnvironment.withRestartStrategiesAndCheckpoints(metaParameters.checkpointLocation)
    implicit val executionConfig = env.getConfig
    val from = env.addSource(source)
    buildStreamTopology(from, env).addSink(sink)
    env.execute(metaParameters.name)
  }

  def buildStreamTopology(from: DataStream[S], env: StreamExecutionEnvironment)(implicit sourceTypeInformation: TypeInformation[S], targetTypeInformation: TypeInformation[T]): DataStream[T] = {
    val filters = filtersDefinition
    val fromFiltered = Metrics.apply(from)
      .map(RowLogger[S])
      .filter(filters.input)
      .uid("filter-on-source-checkpoint")
    transform(fromFiltered)
      .filter(filters.output)
      .uid("filter-on-target-checkpoint")
      .map(RowLogger[T])
  }

  def transform(dataStream: DataStream[S])(implicit sourceTypeInformation: TypeInformation[S], targetTypeInformation: TypeInformation[T]): DataStream[T]

  def source(implicit ec: ExecutionConfig): SourceFunction[S]

  def sink(implicit ec: ExecutionConfig): SinkFunction[T]

  def filtersDefinition: InputOutputFilter[S, T]

}