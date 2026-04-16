package phoenix.payments.application

import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

private[application] object WithdrawalProcessingErrors {
  def insufficientFunds(walletId: WalletId): NotificationHandlingError =
    RefusedByRiskManagement(s"Punter [punterId = ${walletId.owner}, walletId = $walletId] has insufficient funds")

  def reservationAlreadyExists(walletId: WalletId, reservationId: ReservationId): NotificationHandlingError =
    ProcessingError(
      s"Reservation already exists [punterId=${walletId.owner}, walletId=$walletId, reservationId=$reservationId]")

  def walletNotFound(walletId: WalletId): NotificationHandlingError =
    ProcessingError(s"Punter wallet missing [punterId = ${walletId.owner}, walletId = $walletId]")

  def reservationNotFound(walletId: WalletId, reservationId: ReservationId): NotificationHandlingError =
    ProcessingError(s"Reservation not found [punterId = ${walletId.owner}, reservationId = $reservationId]")
}
