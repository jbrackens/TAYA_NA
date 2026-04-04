package net.flipsports.gmx.streaming.internal.customers.operation.streams.builders

import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.{LoginsImplicit, PreJoinImplicit}
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{Logins, Streams}
import net.flipsports.gmx.streaming.internal.customers.operation.watermarks.LoginsMessageCreationDateAssigner
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class LoginsStreamBuilder extends Serializable {

  def build(env: StreamExecutionEnvironment, source: SourceFunction[Types.Logins.Source]): Streams.PreJoinLoginStream = {
    buildTopology {
      SourceDataStreamBuilder
        .withSource[Logins.Source](env, source, "customer-logins")(LoginsImplicit.keyWithValue)
    }

  }

  @VisibleForTesting
  def buildTopology(dataStream:  => Streams.LoginStream): Streams.PreJoinLoginStream = {
    dataStream
    .assignTimestampsAndWatermarks(LoginsMessageCreationDateAssigner())
      .name("gmx-streaming.customer-logins")
      .map(r => new Tuple2(r.f1.getCustomerID, r.f1))(PreJoinImplicit.Logins.keyWithValue)
      .keyBy(_.f1.getCustomerID)(PreJoinImplicit.key)
      .map(i => i)(PreJoinImplicit.Logins.keyWithValue)
  }

}

object LoginsStreamBuilder {

  def apply(): LoginsStreamBuilder = new LoginsStreamBuilder()

}