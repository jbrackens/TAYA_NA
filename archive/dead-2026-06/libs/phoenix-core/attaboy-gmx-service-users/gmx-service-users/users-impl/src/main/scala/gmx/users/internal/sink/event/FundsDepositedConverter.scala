package gmx.users.internal.sink.event

import com.typesafe.scalalogging.LazyLogging
import gmx.common.internal.scala.core.time.TimeUtils.toEpochMilli
import gmx.dataapi.internal.common.DecimalConverter
import gmx.dataapi.internal.customer.FundsDeposited
import gmx.users.internal.{ aggregate => internal }

object FundsDepositedConverter extends LazyLogging {

  def convert(in: internal.UserEvent): FundsDeposited = {
    logger.info("converting FundsDeposited")
    val event = in.asInstanceOf[internal.FundsDeposited]
    new FundsDeposited(
      event.processingHeader.messageId,
      toEpochMilli(event.processingHeader.messageOriginDate),
      toEpochMilli(event.processingHeader.messageProcessingDate),
      event.customerHeader.brandId,
      event.customerHeader.customerId,
      toEpochMilli(event.deposit.depositedAt),
      DecimalConverter.toString(event.deposit.amount),
      event.currencyCode,
      event.deposit.paymentMethod.toString,
      event.deposit.status.toString,
      event.deposit.paymentAccountIdentifier,
      event.deposit.paymentDetails,
      event.deposit.gatewayCorrelationId
    )
  }
}
