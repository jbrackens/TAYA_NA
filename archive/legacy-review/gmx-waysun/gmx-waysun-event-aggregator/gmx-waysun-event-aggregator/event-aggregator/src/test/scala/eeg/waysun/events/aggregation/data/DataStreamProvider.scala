package eeg.waysun.events.aggregation.data

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

object DataStreamProvider {
  def apply[A](given: Seq[A])(implicit t: TypeInformation[A], env: StreamExecutionEnvironment): DataStream[A] =
    new DataStream[A](env.fromCollection(`given`).javaStream)

  object WithTypeInformation {
    def apply[A](given: Seq[A], t: TypeInformation[A])(implicit env: StreamExecutionEnvironment): DataStream[A] =
      DataStreamProvider(given)(t, env)
  }
}
