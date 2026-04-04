package gmx.users.internal.source.sbtech

import java.util.UUID

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import com.typesafe.scalalogging.LazyLogging
import gmx.common.internal.scala.core.time.TimeUtils.{ fromEpochMilli, getCurrentTime }
import gmx.dataapi.internal.common.DecimalConverter
import gmx.dataapi.internal.customer.DepositLimitScopeEnum
import gmx.users.internal.aggregate.Metadata.{ CustomerHeader, ProcessingHeader }
import gmx.users.internal.aggregate._
import gmx.users.internal.source.RecordToCommandProcessor

object SbTechCustomerDetailProcessor extends RecordToCommandProcessor[CustomerDetail] with LazyLogging {

  private val unknowableDepositLimitScope = DepositLimitScopeEnum.UNKNOWABLE
  private val supportedDepositLimitScopeEnum: Map[String, DepositLimitScopeEnum] = DepositLimitScopeEnum
    .values()
    .toSeq
    .filterNot(_.equals(unknowableDepositLimitScope))
    .map(e => (e.name().toLowerCase, e))
    .to(Map)

  override def provideCustomerId(key: CustomerDetail): String =
    key.getCustomerID.toString

  override def extractCommands(
      brandId: String,
      value: CustomerDetail
    ): Seq[UserCommand] =
    Seq(
      extractSetDepositLimit(brandId, value),
      extractSetTimeout(brandId, value)
    ).flatten

  private def extractSetDepositLimit(
      brandId: String,
      value: CustomerDetail
    ) =
    Some(
      SetDepositLimit(
        ProcessingHeader(UUID.randomUUID().toString, fromEpochMilli(value.getMessageCreationDate), getCurrentTime),
        CustomerHeader(brandId, value.getCustomerID.toString),
        DepositLimit(
          mapDepositLimitScope(value.getDepositLimitTypeCode.toString),
          DecimalConverter.toDecimal(value.getDepositLimit),
          SetBy(value.getEmpoyeeID.toString, fromEpochMilli(value.getLoadingUpdateDate)),
          brandId
        )
      )
    )

  private def mapDepositLimitScope(in: String): DepositLimitScopeEnum =
    supportedDepositLimitScopeEnum.getOrElse(in.toLowerCase, unknowableDepositLimitScope)

  private def extractSetTimeout(
      brandId: String,
      value: CustomerDetail
    ) =
    if (!value.getIsOnTimeOut) {
      logger.debug("No timeout information in CustomerDetail (creationDate: {})", value.getMessageCreationDate)
      None
    } else
      Some(
        SetTimeout(
          ProcessingHeader(UUID.randomUUID().toString, fromEpochMilli(value.getMessageCreationDate), getCurrentTime),
          CustomerHeader(brandId, value.getCustomerID.toString),
          TimeOut(
            fromEpochMilli(value.getTimeoutStartDate),
            fromEpochMilli(value.getTimeoutEndDate),
            SetBy(value.getEmpoyeeID.toString, fromEpochMilli(value.getLoadingUpdateDate)),
            brandId
          )
        )
      )
}
