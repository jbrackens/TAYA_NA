package phoenix.payments.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.applicativeError._
import org.postgresql.util.PSQLException
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.core.persistence.PostgresConstraintPredicates
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.CashWithdrawalReservation
import phoenix.payments.domain.CashWithdrawalReservationsRepository
import phoenix.payments.domain.CashWithdrawalReservationsRepository.CashWithdrawalIdentifierAlreadyExists
import phoenix.projections.DomainMappers._

final class SlickCashWithdrawalReservationsRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit
    ec: ExecutionContext)
    extends CashWithdrawalReservationsRepository {
  import dbConfig.db

  private val cashWithdrawalReservations: TableQuery[CashWithdrawalReservationsTable] =
    TableQuery[CashWithdrawalReservationsTable]

  override def insert(cashWithdrawalReservation: CashWithdrawalReservation)
      : EitherT[Future, CashWithdrawalIdentifierAlreadyExists.type, Unit] =
    db.run(cashWithdrawalReservations += cashWithdrawalReservation)
      .attemptT
      .leftMap {
        case ex: PSQLException if PostgresConstraintPredicates.uniquenessViolated(ex) =>
          CashWithdrawalIdentifierAlreadyExists
        case ex => throw ex
      }
      .map(_ => ())

  override def remove(cashWithdrawalIdentifier: CashWithdrawalIdentifier): Future[Unit] =
    db.run(cashWithdrawalReservations.filter(_.identifier === cashWithdrawalIdentifier).delete).map(_ => ())

  override def find(cashWithdrawalIdentifier: CashWithdrawalIdentifier): Future[Option[CashWithdrawalReservation]] =
    db.run(cashWithdrawalReservations.filter(_.identifier === cashWithdrawalIdentifier).result.headOption)
}

private final class CashWithdrawalReservationsTable(tag: Tag)
    extends Table[CashWithdrawalReservation](tag, "cash_withdrawal_reservations") {
  type TableRow = (String, OffsetDateTime)

  def identifier = column[CashWithdrawalIdentifier]("identifier", O.PrimaryKey)
  def createdAt = column[OffsetDateTime]("created_at")

  def * = (identifier, createdAt).mapTo[CashWithdrawalReservation]
}
