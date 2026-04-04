package gmx.users.internal.source.sbtech

import java.util.UUID

import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.{ OperationGroupEnum, OperationTypeEnum, WalletTransaction }
import com.typesafe.scalalogging.LazyLogging
import gmx.common.internal.scala.core.time.TimeUtils.{ fromEpochMilli, getCurrentTime }
import gmx.dataapi.internal.common.DecimalConverter
import gmx.dataapi.internal.customer.{ DepositPaymentMethodEnum, DepositStatusEnum }
import gmx.users.internal.aggregate.Metadata.{ CustomerHeader, ProcessingHeader }
import gmx.users.internal.aggregate.{ Deposit, DepositFunds, UserCommand }
import gmx.users.internal.source.RecordToCommandProcessor

import scala.jdk.OptionConverters._

object SbTechWalletTransactionProcessor extends RecordToCommandProcessor[WalletTransaction] with LazyLogging {

  override def provideCustomerId(key: WalletTransaction): String =
    key.getCustomerID.toString

  override def extractCommands(
      brandId: String,
      value: WalletTransaction
    ): Seq[UserCommand] =
    Seq(
      extractDepositFunds(brandId, value)
    ).flatten

  private def extractDepositFunds(
      brandId: String,
      value: WalletTransaction
    ): Option[DepositFunds] = {
    val operation = OperationGroupEnum.find(value.getOperationMasterGroup).toScala

    operation match {
      case Some(OperationGroupEnum.ExternalDeposits) =>
        Some(buildDepositFunds(brandId, value))
      case Some(OperationGroupEnum.ExternalWithdrawals) =>
        logger.debug("Skipping Withdrawal event in WalletTransaction (creationDate: {})", value.getMessageCreationDate)
        None
      case None =>
        logger.warn("Unsupported operation type {} in WalletTransaction (creationDate: {})",
                    value.getOperationMasterGroup,
                    value.getMessageCreationDate
        )
        None
    }
  }

  private def buildDepositFunds(
      brandId: String,
      value: WalletTransaction
    ) = {
    val transactionNotes = TransactionNotesWrapper.build(value.getNotes.toString)
    DepositFunds(
      ProcessingHeader(UUID.randomUUID().toString, fromEpochMilli(value.getMessageCreationDate), getCurrentTime),
      CustomerHeader(brandId, value.getCustomerID.toString),
      Deposit(
        value.getWalletTransactionID.toString,
        fromEpochMilli(value.getUpdateDate),
        DecimalConverter.toDecimal(value.getAmountUserCurrency),
        mapPaymentMethod(value.getOperationTypeID),
        mapStatus(value.getStatus.toString),
        transactionNotes.paymentAccountIdentifier.getOrElse(""),
        transactionNotes.paymentDetails.getOrElse(""),
        transactionNotes.gatewayCorrelationId.getOrElse(""),
        brandId
      )
    )
  }

  private def mapPaymentMethod(operationTypeId: Int): DepositPaymentMethodEnum = {
    val operation = OperationTypeEnum.find(operationTypeId).toScala

    operation match {
      case Some(OperationTypeEnum.MobileApplePayDeposit)           => DepositPaymentMethodEnum.ApplePay
      case Some(OperationTypeEnum.MobileCreditCardDeposit)         => DepositPaymentMethodEnum.DebitCard
      case Some(OperationTypeEnum.MobileVerifiedCreditCardDeposit) => DepositPaymentMethodEnum.DebitCard
      case Some(OperationTypeEnum.MobileCreditCardWithdrawal)      => DepositPaymentMethodEnum.DebitCard
      case None                                                    => DepositPaymentMethodEnum.UNKNOWABLE
    }
  }

  private def mapStatus(status: String): DepositStatusEnum =
    status match {
      case "Pending"   => DepositStatusEnum.Pending
      case "Confirmed" => DepositStatusEnum.Confirmed
      case "Declined"  => DepositStatusEnum.Declined
      case _           => DepositStatusEnum.UNKNOWABLE
    }
}
