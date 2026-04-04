package gmx.users.internal.sink.event

import com.typesafe.scalalogging.LazyLogging
import gmx.common.internal.scala.core.time.TimeUtils.toEpochMilli
import gmx.dataapi.internal.customer.CustomerLoggedIn
import gmx.users.internal.{ aggregate => internal }

object CustomerLoggedInConverter extends LazyLogging {

  def convert(in: internal.UserEvent): CustomerLoggedIn = {
    logger.info("converting CustomerLoggedIn")
    val event = in.asInstanceOf[internal.CustomerLoggedIn]
    new CustomerLoggedIn(
      event.processingHeader.messageId,
      toEpochMilli(event.processingHeader.messageOriginDate),
      toEpochMilli(event.processingHeader.messageProcessingDate),
      event.customerHeader.brandId,
      event.customerHeader.customerId,
      toEpochMilli(event.loggedIn.loggedInAt),
      event.timeZoneOffset
    )
  }
}
