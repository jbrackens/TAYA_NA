package phoenix.payments.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.CashWithdrawalReservation
import phoenix.payments.domain.CashWithdrawalReservationsRepository
import phoenix.payments.domain.CashWithdrawalReservationsRepository.CashWithdrawalIdentifierAlreadyExists

final class InMemoryCashWithdrawalReservationsRepository(
    var reservations: List[CashWithdrawalReservation] = List.empty)(implicit ec: ExecutionContext)
    extends CashWithdrawalReservationsRepository {

  override def insert(
      reservation: CashWithdrawalReservation): EitherT[Future, CashWithdrawalIdentifierAlreadyExists.type, Unit] =
    if (reservations.exists(_.identifier == reservation.identifier)) {
      EitherT.leftT(CashWithdrawalIdentifierAlreadyExists)
    } else {
      reservations = reservations :+ reservation
      EitherT.safeRightT(())
    }

  override def remove(cashWithdrawalIdentifier: CashWithdrawalIdentifier): Future[Unit] = {
    reservations = reservations.filterNot(_.identifier == cashWithdrawalIdentifier)
    Future.unit
  }

  override def find(cashWithdrawalIdentifier: CashWithdrawalIdentifier): Future[Option[CashWithdrawalReservation]] =
    Future.successful(reservations.find(_.identifier == cashWithdrawalIdentifier))
}
