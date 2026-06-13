package gmx.users.internal.aggregate

import java.time.ZonedDateTime

object Metadata {

  case class ProcessingHeader(
      messageId: String,
      messageOriginDate: ZonedDateTime,
      messageProcessingDate: ZonedDateTime)

  case class CustomerHeader(
      brandId: String,
      customerId: String)

}
