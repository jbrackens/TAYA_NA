package gmx.users.internal.sink.event

import com.typesafe.scalalogging.LazyLogging
import gmx.common.internal.scala.core.time.TimeUtils.toEpochMilli
import gmx.dataapi.internal.customer.TimeoutSet
import gmx.users.internal.{ aggregate => internal }

object TimeoutSetConverter extends LazyLogging {

  def convert(in: internal.UserEvent): TimeoutSet = {
    logger.info("converting TimeOutSet")
    val event = in.asInstanceOf[internal.TimeOutSet]
    new TimeoutSet(
      event.processingHeader.messageId,
      toEpochMilli(event.processingHeader.messageOriginDate),
      toEpochMilli(event.processingHeader.messageProcessingDate),
      event.customerHeader.brandId,
      event.customerHeader.customerId,
      toEpochMilli(event.timeout.startTime),
      toEpochMilli(event.timeout.endTime)
    )
  }
}
