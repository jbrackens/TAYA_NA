package phoenix.dbviews.infrastructure

import enumeratum.SlickEnumSupport

import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.dbviews.domain.model.AccountStatus
import phoenix.dbviews.domain.model.AccountType
import phoenix.dbviews.domain.model.ExclusionReason
import phoenix.dbviews.domain.model.GameType
import phoenix.dbviews.domain.model.KYCVerificationMethod
import phoenix.dbviews.domain.model.KYCVerificationStatus
import phoenix.dbviews.domain.model.LimitPeriod
import phoenix.dbviews.domain.model.LimitType
import phoenix.dbviews.domain.model.TransactionDescription
import phoenix.dbviews.domain.model.TransactionProvider
import phoenix.dbviews.domain.model.TransactionSource
import phoenix.dbviews.domain.model.TransactionType
import phoenix.dbviews.domain.model.TransferDescription
import phoenix.dbviews.domain.model.TransferType

object SlickViewMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile
  import profile.api._

  implicit val typeMapper: BaseColumnType[TransactionType] = mappedColumnTypeForEnum(TransactionType)
  implicit val descriptionMapper: BaseColumnType[TransactionDescription] = mappedColumnTypeForEnum(
    TransactionDescription)
  implicit val sourceMapper: BaseColumnType[TransactionSource] = mappedColumnTypeForEnum(TransactionSource)
  implicit val providerMapper: BaseColumnType[TransactionProvider] = mappedColumnTypeForEnum(TransactionProvider)
  implicit val limitTypeMapper: BaseColumnType[LimitType] = mappedColumnTypeForEnum(LimitType)
  implicit val limitPeriodMapper: BaseColumnType[LimitPeriod] = mappedColumnTypeForEnum(LimitPeriod)
  implicit val accountTypeMapper: BaseColumnType[AccountType] = mappedColumnTypeForEnum(AccountType)
  implicit val accountStatusMapper: BaseColumnType[AccountStatus] = mappedColumnTypeForEnum(AccountStatus)
  implicit val exclusionReasonMapper: BaseColumnType[ExclusionReason] = mappedColumnTypeForEnum(ExclusionReason)
  implicit val gameTypeMapper: BaseColumnType[GameType] = mappedColumnTypeForEnum(GameType)
  implicit val transferTypeMapper: BaseColumnType[TransferType] = mappedColumnTypeForEnum(TransferType)
  implicit val transferDescriptionMapper: BaseColumnType[TransferDescription] = mappedColumnTypeForEnum(
    TransferDescription)
  implicit val verificationMethodMapper: BaseColumnType[KYCVerificationMethod] = mappedColumnTypeForEnum(
    KYCVerificationMethod)
  implicit val verificationStatusMapper: BaseColumnType[KYCVerificationStatus] = mappedColumnTypeForEnum(
    KYCVerificationStatus)
}
