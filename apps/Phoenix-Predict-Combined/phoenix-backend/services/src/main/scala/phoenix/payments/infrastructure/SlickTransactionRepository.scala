package phoenix.payments.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.OptionT
import enumeratum.SlickEnumSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.PrimaryKey
import slick.lifted.ProvenShape
import slick.lifted.Tag

import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionRepository
import phoenix.payments.domain.TransactionStatus
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.PunterId

private[payments] final class SlickTransactionRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit
    ec: ExecutionContext)
    extends TransactionRepository {
  import dbConfig.db

  private val transactions: TableQuery[PaymentTransactionsTable] = TableQuery[PaymentTransactionsTable]

  override def upsert(transaction: PaymentTransaction): Future[Unit] =
    db.run(transactions.insertOrUpdate(transaction)).map(_ => ())

  override def find(punterId: PunterId, transactionId: TransactionId): OptionT[Future, PaymentTransaction] =
    OptionT(
      db.run(
        transactions
          .filter(transaction => transaction.punterId === punterId && transaction.transactionId === transactionId)
          .take(1)
          .result
          .headOption))
}

private final class PaymentTransactionsTable(tag: Tag) extends Table[PaymentTransaction](tag, "payment_transactions") {

  import PaymentTransactionsMappers._

  def transactionId: Rep[TransactionId] = column[TransactionId]("transaction_id")
  def punterId: Rep[PunterId] = column[PunterId]("punter_id")
  def paymentDirection: Rep[PaymentDirection] = column[PaymentDirection]("payment_direction")
  def amount: Rep[MoneyAmount] = column[MoneyAmount]("amount")
  def status: Rep[TransactionStatus] = column[TransactionStatus]("status")

  def primaryKey: PrimaryKey = primaryKey("payment_transactions_pkey", (punterId, transactionId))

  override def * : ProvenShape[PaymentTransaction] =
    (
      transactionId,
      punterId,
      paymentDirection,
      amount,
      status) <> ((PaymentTransaction.apply _).tupled, PaymentTransaction.unapply)
}

private object PaymentTransactionsMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile

  implicit val paymentDirectionMapper: BaseColumnType[PaymentDirection] = mappedColumnTypeForEnum(PaymentDirection)
  implicit val statusMapper: BaseColumnType[TransactionStatus] = mappedColumnTypeForEnum(TransactionStatus)
}
