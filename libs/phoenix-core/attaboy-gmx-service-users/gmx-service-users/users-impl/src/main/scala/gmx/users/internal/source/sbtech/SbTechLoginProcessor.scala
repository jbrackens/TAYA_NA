package gmx.users.internal.source.sbtech

import java.util.UUID

import SBTech.Microservices.DataStreaming.DTO.Login.v1.Login
import gmx.common.internal.scala.core.time.TimeUtils.{ fromEpochMilli, getCurrentTime }
import gmx.users.internal.aggregate.Metadata.{ CustomerHeader, ProcessingHeader }
import gmx.users.internal.aggregate._
import gmx.users.internal.source.RecordToCommandProcessor

object SbTechLoginProcessor extends RecordToCommandProcessor[Login] {

  override def provideCustomerId(key: Login): String =
    key.getCustomerID.toString

  override def extractCommands(
      brandId: String,
      value: Login
    ): Seq[UserCommand] =
    //TODO detect logouts!! | https://flipsports.atlassian.net/browse/GMV3-260
    Seq(
      extractLogCustomerIn(brandId, value)
    )

  private def extractLogCustomerIn(
      brandId: String,
      value: Login
    ): LogCustomerIn =
    LogCustomerIn(
      ProcessingHeader(UUID.randomUUID().toString, fromEpochMilli(value.getMessageCreationDate), getCurrentTime),
      CustomerHeader(brandId, value.getCustomerID.toString),
      LoggedIn(
        fromEpochMilli(value.getLoginDate),
        value.getDeviceType.toString,
        brandId
      )
    )
}
