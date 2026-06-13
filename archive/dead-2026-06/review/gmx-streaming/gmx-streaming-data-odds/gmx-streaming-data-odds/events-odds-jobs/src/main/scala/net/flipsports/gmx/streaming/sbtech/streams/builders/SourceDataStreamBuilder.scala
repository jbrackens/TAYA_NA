package net.flipsports.gmx.streaming.sbtech.streams.builders

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

object SourceDataStreamBuilder extends Serializable {

  def withSource[T](env: StreamExecutionEnvironment, source: SourceFunction[T], name: String)(implicit typeInformation: TypeInformation[T]): DataStream[T] = {
    env
      .addSource(source)
      .name(s"$name")
      .uid(s"$name")
  }
}
