package gmx.users.internal.sink.event

import com.typesafe.scalalogging.LazyLogging
import gmx.common.internal.scala.core.time.TimeUtils.toEpochMilli
import gmx.dataapi.internal.common.DecimalConverter
import gmx.dataapi.internal.customer.DepositLimitSet
import gmx.users.internal.{ aggregate => internal }

object DepositLimitSetConverter extends LazyLogging {

  def convert(in: internal.UserEvent): DepositLimitSet = {
    logger.info("converting DepositLimitSet")
    val event = in.asInstanceOf[internal.DepositLimitSet]
    new DepositLimitSet(
      event.processingHeader.messageId,
      toEpochMilli(event.processingHeader.messageOriginDate),
      toEpochMilli(event.processingHeader.messageProcessingDate),
      event.customerHeader.brandId,
      event.customerHeader.customerId,
      event.limit.scope.toString,
      DecimalConverter.toString(event.limit.limit),
      event.currencyCode
    )
  }
}
