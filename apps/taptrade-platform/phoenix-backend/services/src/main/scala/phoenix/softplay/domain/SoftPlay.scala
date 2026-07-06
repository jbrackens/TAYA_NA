package phoenix.softplay.domain

final case class SuccessfulRegistrationsCount(value: Int)
final case class UnsuccessfulRegistrationsCount(value: Int)
final case class PuntersWithDepositLimitCount(value: Int)
final case class PuntersWithSpendLimitCount(value: Int)
final case class ExcludedPuntersCount(value: Int)
final case class SuspendedPuntersCount(value: Int)

final case class SoftPlayReport(
    successfulRegistrationsCount: SuccessfulRegistrationsCount,
    unsuccessfulRegistrationsCount: UnsuccessfulRegistrationsCount,
    puntersWithDepositLimitCount: PuntersWithDepositLimitCount,
    puntersWithSpendLimitCount: PuntersWithSpendLimitCount,
    excludedPuntersCount: ExcludedPuntersCount,
    suspendedPuntersCount: SuspendedPuntersCount)
