package stella.wallet.models

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import stella.wallet.gen.Generators._
import stella.wallet.models.transaction.TransactionEntity

class TransactionEntitySpec extends AnyFlatSpec with Matchers with ScalaCheckDrivenPropertyChecks {

  "TransactionEntity" should "be properly mapped to Transaction" in {
    forAll(transactionEntityGen) { transactionEntity =>
      val transaction = transactionEntity.toTransaction
      transaction.transactionType shouldBe transactionEntity.transactionType
      transaction.currencyId shouldBe transactionEntity.currencyId
      transaction.amount shouldBe transactionEntity.amount
      transaction.exchangeToCurrencyId shouldBe transactionEntity.exchangeToCurrencyId
      transaction.exchangeRate shouldBe transactionEntity.exchangeRate
      transaction.projectId shouldBe transactionEntity.projectId
      transaction.walletOwnerId shouldBe transactionEntity.walletOwnerId
      transaction.requesterId shouldBe transactionEntity.requesterId
      transaction.externalTransactionId shouldBe transactionEntity.externalTransactionId
      transaction.title shouldBe transactionEntity.title
      transaction.transactionDate shouldBe transactionEntity.transactionDate
    }
  }

  it should "be properly created from transaction" in {
    forAll(transactionGen, transactionIdGen, offsetDateTimeGen) { (transaction, transactionId, createdAt) =>
      val transactionEntity = TransactionEntity.fromTransaction(transaction, transactionId, createdAt)
      transactionEntity.id shouldBe transactionId
      transactionEntity.createdAt shouldBe createdAt
      transactionEntity.transactionType shouldBe transaction.transactionType
      transactionEntity.currencyId shouldBe transaction.currencyId
      transactionEntity.amount shouldBe transaction.amount
      transactionEntity.exchangeToCurrencyId shouldBe transaction.exchangeToCurrencyId
      transactionEntity.exchangeRate shouldBe transaction.exchangeRate
      transactionEntity.projectId shouldBe transaction.projectId
      transactionEntity.walletOwnerId shouldBe transaction.walletOwnerId
      transactionEntity.requesterId shouldBe transaction.requesterId
      transactionEntity.externalTransactionId shouldBe transaction.externalTransactionId
      transactionEntity.title shouldBe transaction.title
      transactionEntity.transactionDate shouldBe transaction.transactionDate
    }
  }
}
