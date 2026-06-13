package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.JoinedCustomerDetailWithLoginsImplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.CustomerLoginStream
import net.flipsports.gmx.streaming.internal.customers.operation.split.OutputTags
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class RegistrationAbuseDownstream extends LazyLogging {
  def processStream(dataStream: CustomerLoginStream, env: StreamExecutionEnvironment): Unit = {
    dataStream
      .getSideOutput(OutputTags.registrationAbuse)
      .map(record => {
        logger.warn(s"Registration abuse for customer id ${record.f1.customerDetail.getCustomerID}")
        record
        }
      )
  }

}

object RegistrationAbuseDownstream {

  def apply(): RegistrationAbuseDownstream = new RegistrationAbuseDownstream()
}