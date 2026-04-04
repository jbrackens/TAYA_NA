package phoenix.payments.domain

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.payments.domain.CashWithdrawalReservationsRepository.CashWithdrawalIdentifierAlreadyExists

trait CashWithdrawalReservationsRepository {

  def insert(cashWithdrawalReservation: CashWithdrawalReservation)
      : EitherT[Future, CashWithdrawalIdentifierAlreadyExists.type, Unit]

  def remove(cashWithdrawalIdentifier: CashWithdrawalIdentifier): Future[Unit]

  def find(cashWithdrawalIdentifier: CashWithdrawalIdentifier): Future[Option[CashWithdrawalReservation]]
}

object CashWithdrawalReservationsRepository {
  object CashWithdrawalIdentifierAlreadyExists
}
