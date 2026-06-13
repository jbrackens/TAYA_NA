package net.flipsports.gmx.streaming.internal.customers.operation.streams.joiner

import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.{JoinedCustomerDetailWithLoginsImplicit, PreJoinImplicit}
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams
import net.flipsports.gmx.streaming.internal.customers.operation.processors.v1.CountryRegistrationAbuseDownstreamProcessor
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows
import org.apache.flink.streaming.api.windowing.time.Time

object CustomerLoginJoiner extends Serializable {

  def join(customerStream: Streams.PreJoinCustomerStream, loginStream: Streams.PreJoinLoginStream): Streams.CustomerLoginStream = {
    customerStream
      .join(loginStream)
      .where(_.f0)(PreJoinImplicit.key).equalTo(_.f0)
      .window(TumblingEventTimeWindows.of(Time.seconds(90)))
      .allowedLateness(Time.minutes(5))
      .apply(CustomersWithLoginsJoiner())(JoinedCustomerDetailWithLoginsImplicit.keyWithValue)
      .process(new CountryRegistrationAbuseDownstreamProcessor())(JoinedCustomerDetailWithLoginsImplicit.keyWithValue)
  }
}
