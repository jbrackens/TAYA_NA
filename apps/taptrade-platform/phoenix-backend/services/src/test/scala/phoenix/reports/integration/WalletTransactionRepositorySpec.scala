package phoenix.reports.integration

import java.time.OffsetDateTime

import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.WalletTransactionRepository
import phoenix.reports.domain.model.wallets.TransactionType
import phoenix.reports.infrastructure.InMemoryWalletTransactionRepository
import phoenix.reports.infrastructure.SlickWalletTransactionRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TruncatedTables
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

final class WalletTransactionRepositorySpec
    extends AnyWordSpec
    with Matchers
    with BeforeAndAfterAll
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with TruncatedTables {

  private val clock: Clock = Clock.utcClock
  private val inMemoryRepository = () => new InMemoryWalletTransactionRepository()
  private val slickRepository = () => {
    truncateTables()
    new SlickWalletTransactionRepository(dbConfig)
  }

  "InMemoryWalletTransactionRepository" should behave.like(walletTransactionRepository(inMemoryRepository))
  "SlickWalletTransactionRepository" should behave.like(walletTransactionRepository(slickRepository))

  private def walletTransactionRepository(emptyRepository: () => WalletTransactionRepository): Unit = {
    "should find pending transactions as of given point in time" in {
      // given
      val objectUnderTest = emptyRepository()
      val referencePoint = clock.currentOffsetDateTime()

      // and
      val beforeReferencePoint = WalletTransaction(
        transactionId = randomString(),
        punterId = generatePunterId(),
        amount = MoneyAmount(2137),
        transactionType = TransactionType.Withdrawal,
        transactionReason = TransactionReason.FundsWithdrawn,
        startedAt = referencePoint.minusHours(1),
        closedAt = None,
        backofficeUserId = None,
        details = None)
      await(objectUnderTest.upsert(beforeReferencePoint))

      // and
      val atReferencePoint = WalletTransaction(
        transactionId = randomString(),
        punterId = generatePunterId(),
        amount = MoneyAmount(2137),
        transactionType = TransactionType.Withdrawal,
        transactionReason = TransactionReason.FundsWithdrawn,
        startedAt = referencePoint,
        closedAt = None,
        backofficeUserId = None,
        details = None)
      await(objectUnderTest.upsert(atReferencePoint))

      // and
      val afterReferencePoint = WalletTransaction(
        transactionId = randomString(),
        punterId = generatePunterId(),
        amount = MoneyAmount(2137),
        transactionType = TransactionType.Withdrawal,
        transactionReason = TransactionReason.FundsWithdrawn,
        startedAt = referencePoint.plusHours(1),
        closedAt = None,
        backofficeUserId = None,
        details = None)
      await(objectUnderTest.upsert(afterReferencePoint))

      // when
      val pendingTransactions = awaitSource(objectUnderTest.findPendingAsOf(referencePoint))

      // then
      pendingTransactions should contain(beforeReferencePoint)
      pendingTransactions should contain(atReferencePoint)
      pendingTransactions should not contain afterReferencePoint
    }

    "should allow marking transaction as closed" in {
      // given
      val objectUnderTest = emptyRepository()
      val referencePoint = clock.currentOffsetDateTime()

      // and
      val transaction = WalletTransaction(
        transactionId = randomString(),
        punterId = generatePunterId(),
        amount = MoneyAmount(2137),
        transactionType = TransactionType.Withdrawal,
        transactionReason = TransactionReason.FundsWithdrawn,
        startedAt = referencePoint.minusDays(1),
        closedAt = None,
        backofficeUserId = None,
        details = None)
      await(objectUnderTest.upsert(transaction))

      // when
      await(objectUnderTest.setClosedAt(transaction.transactionId, closedAt = referencePoint.minusHours(1)))

      // then
      pendingTransactionIds(objectUnderTest, referencePoint) should not contain transaction.transactionId
    }

    "should consider transaction closed based on the reference point" in {
      // given
      val objectUnderTest = emptyRepository()
      val referencePoint = clock.currentOffsetDateTime()

      // and
      val transaction = WalletTransaction(
        transactionId = randomString(),
        punterId = generatePunterId(),
        amount = MoneyAmount(2137),
        transactionType = TransactionType.Withdrawal,
        transactionReason = TransactionReason.FundsWithdrawn,
        startedAt = referencePoint.minusDays(1),
        closedAt = None,
        backofficeUserId = None,
        details = None)
      await(objectUnderTest.upsert(transaction))

      // when
      await(objectUnderTest.setClosedAt(transaction.transactionId, closedAt = referencePoint))

      // then
      val beforeReferencePoint = pendingTransactionIds(objectUnderTest, referencePoint.minusSeconds(1))
      beforeReferencePoint should contain(transaction.transactionId)

      // and
      val atReferencePoint = pendingTransactionIds(objectUnderTest, referencePoint)
      atReferencePoint should not contain transaction.transactionId

      // and
      val afterReferencePoint = pendingTransactionIds(objectUnderTest, referencePoint.plusSeconds(1))
      afterReferencePoint should not contain transaction.transactionId
    }

    // TODO (PHXD-3218): remove after release of PHXD-3115
    "should set transaction reason if transaction exists" in {
      // given
      val objectUnderTest = emptyRepository()
      val referencePoint = clock.currentOffsetDateTime()

      // and
      val transaction = WalletTransaction(
        transactionId = randomString(),
        punterId = generatePunterId(),
        amount = MoneyAmount(2137),
        transactionType = TransactionType.Withdrawal,
        transactionReason = TransactionReason.FundsWithdrawn,
        startedAt = referencePoint.minusDays(1),
        closedAt = None,
        backofficeUserId = None,
        details = None)
      await(objectUnderTest.upsert(transaction))

      // and
      awaitSource(objectUnderTest.findPendingAsOf(referencePoint)).map(_.transactionReason) should contain(
        TransactionReason.FundsWithdrawn)

      // when
      await(objectUnderTest.setTransactionReason(transaction.transactionId, TransactionReason.BetPushed))

      // when
      val pendingTransactions = awaitSource(objectUnderTest.findPendingAsOf(referencePoint))

      // then
      pendingTransactions.map(_.transactionReason) should contain(TransactionReason.BetPushed)

    }
  }

  private def pendingTransactionIds(repository: WalletTransactionRepository, asOf: OffsetDateTime): Set[TransactionId] =
    awaitSource(repository.findPendingAsOf(reference = asOf)).map(_.transactionId).toSet
}
