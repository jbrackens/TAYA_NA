package net.flipsports.gmx.streaming.common.job.builders

import org.apache.flink.api.common.functions.FlatMapFunction
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}


object SourceDataStreamBuilder extends Serializable {

  def withSource[T](env: StreamExecutionEnvironment, source: SourceFunction[T], name: String)(implicit
      typeInformation: TypeInformation[T]): DataStream[T] = {
    env.addSource(source).name(s"$name-source").uid(s"id-$name")
  }

  def withSourceAndTransformation[S, T](env: StreamExecutionEnvironment, source: SourceFunction[S], name: String)
      (flatMapFunction: FlatMapFunction[S, T])
      (implicit sourceTypeInformation: TypeInformation[S], transformedTypeInformation: TypeInformation[T]): DataStream[T] =
    withSource(env, source, name).flatMap(flatMapFunction)

}