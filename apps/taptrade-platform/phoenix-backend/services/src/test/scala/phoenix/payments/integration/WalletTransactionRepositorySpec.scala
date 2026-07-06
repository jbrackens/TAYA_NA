package phoenix.payments.integration

import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.currency.MoneyAmount
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.TransactionRepository
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.infrastructure.InMemoryTransactionRepository
import phoenix.payments.infrastructure.SlickTransactionRepository
import phoenix.payments.support.PaymentsDataGenerator.generateTransactionId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class WalletTransactionRepositorySpec
    extends AnyWordSpec
    with Matchers
    with BeforeAndAfterAll
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with TruncatedTables {

  private val inMemoryRepository = () => new InMemoryTransactionRepository()
  private val jdbcRepository = () => {
    truncateTables()
    new SlickTransactionRepository(dbConfig)
  }

  "InMemoryTransactionRepository" should behave.like(transactionRepository(inMemoryRepository))
  "SlickTransactionRepository" should behave.like(transactionRepository(jdbcRepository))

  private def transactionRepository(emptyRepository: () => TransactionRepository): Unit = {
    "creates payment transaction" in {
      // given
      val objectUnderTest = emptyRepository()
      val punterId = generatePunterId()
      val transactionId = generateTransactionId()

      // and
      val expectedTransaction = PaymentTransaction(
        transactionId,
        punterId,
        direction = PaymentDirection.Withdrawal,
        amount = MoneyAmount(2137),
        status = TransactionStatus.Pending)

      await(objectUnderTest.upsert(expectedTransaction))

      // and
      val anotherTransaction = PaymentTransaction(
        generateTransactionId(),
        generatePunterId(),
        direction = PaymentDirection.Deposit,
        amount = MoneyAmount(7312),
        status = TransactionStatus.Pending)

      await(objectUnderTest.upsert(anotherTransaction))

      // when
      val transactionLookup = await(objectUnderTest.find(punterId, transactionId))

      // then
      transactionLookup shouldBe Some(expectedTransaction)
    }

    "updates existing transaction" in {
      // given
      val objectUnderTest = emptyRepository()
      val punterId = generatePunterId()
      val transactionId = generateTransactionId()

      // and
      val createdTransaction = PaymentTransaction(
        transactionId,
        punterId,
        direction = PaymentDirection.Withdrawal,
        amount = MoneyAmount(2137),
        status = TransactionStatus.Pending)

      await(objectUnderTest.upsert(createdTransaction))

      // and
      val updatedTransaction = createdTransaction.copy(status = TransactionStatus.Succeeded)
      await(objectUnderTest.upsert(updatedTransaction))

      // when
      val transactionLookup = await(objectUnderTest.find(punterId, transactionId))

      // then
      transactionLookup shouldBe Some(updatedTransaction)
    }

    "only queries for transaction within given punter activity" in {
      // given
      val objectUnderTest = emptyRepository()
      val punterId = generatePunterId()
      val transactionId = generateTransactionId()

      // and
      val createdTransaction = PaymentTransaction(
        transactionId,
        punterId,
        direction = PaymentDirection.Withdrawal,
        amount = MoneyAmount(2137),
        status = TransactionStatus.Pending)

      await(objectUnderTest.upsert(createdTransaction))

      // when
      val anotherPunter = generatePunterId()
      val transactionLookup = await(objectUnderTest.find(anotherPunter, transactionId))

      // then
      transactionLookup shouldBe None
    }
  }
}
