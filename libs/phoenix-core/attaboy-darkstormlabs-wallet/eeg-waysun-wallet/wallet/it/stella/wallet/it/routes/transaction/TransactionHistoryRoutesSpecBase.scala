package stella.wallet.it.routes.transaction

import java.time.OffsetDateTime

import scala.math.Ordered.orderingToOrdered

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.it.routes.CurrencyOperations
import stella.wallet.it.routes.RoutesSpecBase
import stella.wallet.it.routes.WalletOperations
import stella.wallet.it.utils.TestAuthContext
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionType
import stella.wallet.models.wallet.FundsTransferType
import stella.wallet.models.wallet.PositiveBigDecimal
import stella.wallet.routes.SampleObjectFactory._

// TODO (SP-92): include the exchange operations in the tests
abstract class TransactionHistoryRoutesSpecBase(mainTestName: String)
    extends RoutesSpecBase
    with CurrencyOperations
    with WalletOperations {

  def fetchTransactions(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      transactionTypes: Set[TransactionType] = Set.empty,
      dateRangeStart: Option[OffsetDateTime] = None,
      dateRangeEnd: Option[OffsetDateTime] = None,
      sortFromNewestToOldest: Option[Boolean] = None): Seq[Transaction]

  def fetchTransactionsWithNotFoundError(projectId: ProjectId, walletOwnerId: UserId, currencyId: CurrencyId): Unit

  trait TestData {
    // GIVEN: transactions for many users and many projects for various currencies
    val projectId1 = ProjectId.random()
    val projectId2 = ProjectId.random()
    val currencyId1 = createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectId1, projectId2)
    val currencyId2 = createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectId1)
    val currencyId3 = createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectId2)
    val userId1 = UserId.random()
    val userId2 = UserId.random()

    val adminId1 = UserId.random()
    val adminId2 = UserId.random()
    // first user wallet
    val tx1Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId1,
      userId1,
      currencyId1,
      PositiveBigDecimal(10.1),
      FundsTransferType.TopUpFunds,
      "tx1_id",
      "Tx1 title",
      adminId1)
    testClock.moveTime()

    val tx2Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId2,
      userId1,
      currencyId1,
      PositiveBigDecimal(2),
      FundsTransferType.TopUpFunds,
      "tx2_id",
      "Tx2 title",
      adminId2)
    testClock.moveTime()
    val tx3Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId1,
      userId1,
      currencyId2,
      PositiveBigDecimal(7),
      FundsTransferType.TopUpFunds,
      "tx3_id",
      "Tx3 title",
      adminId1)
    testClock.moveTime()
    val tx4Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId2,
      userId1,
      currencyId1,
      PositiveBigDecimal(1.8),
      FundsTransferType.WithdrawFunds,
      "tx4_id",
      "Tx4 title",
      adminId2)
    testClock.moveTime()

    // second user wallet
    val tx5Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId2,
      userId2,
      currencyId1,
      PositiveBigDecimal(64),
      FundsTransferType.TopUpFunds,
      "tx5_id",
      "Tx5 title",
      adminId2)
    testClock.moveTime()
    val tx6Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId2,
      userId2,
      currencyId3,
      PositiveBigDecimal(32.99),
      FundsTransferType.TopUpFunds,
      "tx6_id",
      "Tx6 title",
      adminId1)
    testClock.moveTime()
    val tx7Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId2,
      userId2,
      currencyId3,
      PositiveBigDecimal(10),
      FundsTransferType.WithdrawFunds,
      "tx7_id",
      "Tx7 title",
      adminId1)
    testClock.moveTime()
    val tx8Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId2,
      userId2,
      currencyId3,
      PositiveBigDecimal(12.99),
      FundsTransferType.WithdrawFunds,
      "tx8_id",
      "Tx8 title",
      adminId2)
    testClock.moveTime()
    val tx9Date = testClock.currentUtcOffsetDateTime()
    transferFunds(
      projectId2,
      userId2,
      currencyId3,
      PositiveBigDecimal(7.5),
      FundsTransferType.TopUpFunds,
      "tx9_id",
      "Tx9 title",
      adminId1)

    val tx1 = Transaction.forTopUp(
      currencyId = currencyId1,
      amount = PositiveBigDecimal(10.1),
      projectId = projectId1,
      walletOwnerId = userId1,
      requesterId = adminId1,
      externalTransactionId = "tx1_id",
      title = "Tx1 title",
      transactionDate = tx1Date)
    val tx2 = Transaction.forTopUp(
      currencyId = currencyId1,
      amount = PositiveBigDecimal(2),
      projectId = projectId2,
      walletOwnerId = userId1,
      requesterId = adminId2,
      externalTransactionId = "tx2_id",
      title = "Tx2 title",
      transactionDate = tx2Date)
    val tx3 = Transaction.forTopUp(
      currencyId = currencyId2,
      amount = PositiveBigDecimal(7),
      projectId = projectId1,
      walletOwnerId = userId1,
      requesterId = adminId1,
      externalTransactionId = "tx3_id",
      title = "Tx3 title",
      transactionDate = tx3Date)
    val tx4 = Transaction.forWithdraw(
      currencyId = currencyId1,
      amount = BigDecimal(-1.8),
      projectId = projectId2,
      walletOwnerId = userId1,
      requesterId = adminId2,
      externalTransactionId = "tx4_id",
      title = "Tx4 title",
      transactionDate = tx4Date)
    val tx5 = Transaction.forTopUp(
      currencyId = currencyId1,
      amount = PositiveBigDecimal(64),
      projectId = projectId2,
      walletOwnerId = userId2,
      requesterId = adminId2,
      externalTransactionId = "tx5_id",
      title = "Tx5 title",
      transactionDate = tx5Date)
    val tx6 = Transaction.forTopUp(
      currencyId = currencyId3,
      amount = PositiveBigDecimal(32.99),
      projectId = projectId2,
      walletOwnerId = userId2,
      requesterId = adminId1,
      externalTransactionId = "tx6_id",
      title = "Tx6 title",
      transactionDate = tx6Date)
    val tx7 = Transaction.forWithdraw(
      currencyId = currencyId3,
      amount = BigDecimal(-10),
      projectId = projectId2,
      walletOwnerId = userId2,
      requesterId = adminId1,
      externalTransactionId = "tx7_id",
      title = "Tx7 title",
      transactionDate = tx7Date)
    val tx8 = Transaction.forWithdraw(
      currencyId = currencyId3,
      amount = BigDecimal(-12.99),
      projectId = projectId2,
      walletOwnerId = userId2,
      requesterId = adminId2,
      externalTransactionId = "tx8_id",
      title = "Tx8 title",
      transactionDate = tx8Date)
    val tx9 = Transaction.forTopUp(
      currencyId = currencyId3,
      amount = PositiveBigDecimal(7.5),
      projectId = projectId2,
      walletOwnerId = userId2,
      requesterId = adminId1,
      externalTransactionId = "tx9_id",
      title = "Tx9 title",
      transactionDate = tx9Date)

    val currency1Project1User1Transactions, currency1Project2User1Transactions = List(tx4, tx2, tx1)
    val currency2Project1User1Transactions = List(tx3)
    val currency1Project1User2Transactions, currency1Project2User2Transactions = List(tx5)
    val currency3Project2User2Transactions = List(tx9, tx8, tx7, tx6)
  }

  mainTestName should {

    "return not found when currency is not associated with project" in {
      fetchTransactionsWithNotFoundError(ProjectId.random(), testUserId, testCurrencyId)
    }

    "return empty result for user without any transactions" in {
      val authContext = TestAuthContext()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(authContext.primaryProjectId)
      fetchTransactions(authContext.primaryProjectId, authContext.userId, currencyId) mustBe empty
    }

    "return user transactions for currencies associated with a project" in {
      new TestData {

        // WHEN: we fetch transactions for various currencies, users and projects
        // THEN: the proper values are returned
        eventually {
          fetchTransactions(projectId2, userId2, currencyId3) shouldBe currency3Project2User2Transactions
        }

        eventually {
          fetchTransactions(projectId1, userId2, currencyId1) shouldBe currency1Project1User2Transactions
        }

        eventually {
          fetchTransactions(projectId2, userId2, currencyId1) shouldBe currency1Project2User2Transactions
        }

        eventually {
          fetchTransactions(projectId1, userId1, currencyId1) shouldBe currency1Project1User1Transactions
        }

        eventually {
          fetchTransactions(projectId2, userId1, currencyId1) shouldBe currency1Project2User1Transactions
        }

        eventually {
          fetchTransactions(projectId1, userId1, currencyId2) shouldBe currency2Project1User1Transactions
        }
      }
    }

    "return transactions filtered by transaction type" in {
      new TestData {
        eventually {
          fetchTransactions(
            projectId1,
            userId1,
            currencyId1,
            Set(TransactionType.TopUp)) shouldBe currency1Project1User1Transactions.filter(
            _.transactionType == TransactionType.TopUp)
        }
        fetchTransactions(
          projectId1,
          userId1,
          currencyId1,
          Set(TransactionType.Withdraw)) shouldBe currency1Project1User1Transactions.filter(
          _.transactionType == TransactionType.Withdraw)
        fetchTransactions(
          projectId1,
          userId1,
          currencyId1,
          Set(TransactionType.Withdraw, TransactionType.TopUp)) shouldBe currency1Project1User1Transactions
        fetchTransactions(
          projectId1,
          userId1,
          currencyId1,
          Set(TransactionType.TopUp, TransactionType.Withdraw)) shouldBe currency1Project1User1Transactions
        fetchTransactions(projectId1, userId1, currencyId1) shouldBe currency1Project1User1Transactions
      }
    }

    "return properly ordered transactions" in {
      new TestData {
        val transactionsOrderedAsc = currency3Project2User2Transactions.sortBy(_.transactionDate)
        val transactionsOrderedDesc = transactionsOrderedAsc.reverse
        transactionsOrderedAsc should not be transactionsOrderedDesc

        eventually {
          fetchTransactions(
            projectId2,
            userId2,
            currencyId3,
            sortFromNewestToOldest = None) shouldBe transactionsOrderedDesc
        }

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          sortFromNewestToOldest = Some(true)) shouldBe transactionsOrderedDesc

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          sortFromNewestToOldest = Some(false)) shouldBe transactionsOrderedAsc
      }
    }

    "return transactions in proper dates range" in {
      new TestData {
        eventually {
          fetchTransactions(
            projectId2,
            userId2,
            currencyId3,
            dateRangeStart = None,
            dateRangeEnd = None) shouldBe currency3Project2User2Transactions
        }

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          dateRangeStart = Some(tx5Date),
          dateRangeEnd = Some(tx9Date)) shouldBe currency3Project2User2Transactions

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          dateRangeStart = Some(tx6Date),
          dateRangeEnd = Some(tx9Date)) shouldBe currency3Project2User2Transactions.filter(_.transactionDate >= tx6Date)

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          dateRangeStart = Some(tx6Date),
          dateRangeEnd = None) shouldBe currency3Project2User2Transactions.filter(_.transactionDate >= tx6Date)

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          dateRangeStart = Some(tx5Date),
          dateRangeEnd = Some(tx8Date)) shouldBe currency3Project2User2Transactions.filter(_.transactionDate <= tx8Date)

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          dateRangeStart = None,
          dateRangeEnd = Some(tx8Date)) shouldBe currency3Project2User2Transactions.filter(_.transactionDate <= tx8Date)

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          dateRangeStart = Some(tx6Date),
          dateRangeEnd = Some(tx8Date)) shouldBe currency3Project2User2Transactions
          .filter(_.transactionDate >= tx6Date)
          .filter(_.transactionDate <= tx8Date)
      }
    }

    "return transactions for mixed params" in {
      new TestData {
        eventually {
          fetchTransactions(
            projectId2,
            userId2,
            currencyId3,
            transactionTypes = Set(TransactionType.TopUp),
            dateRangeStart = Some(tx5Date),
            dateRangeEnd = Some(tx9Date),
            sortFromNewestToOldest = Some(false)) shouldBe currency3Project2User2Transactions
            .filter(_.transactionType == TransactionType.TopUp)
            .reverse
        }

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          transactionTypes = Set(TransactionType.TopUp),
          dateRangeStart = Some(tx5Date),
          dateRangeEnd = Some(tx9Date),
          sortFromNewestToOldest = Some(true)) shouldBe currency3Project2User2Transactions.filter(
          _.transactionType == TransactionType.TopUp)

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          transactionTypes = Set(TransactionType.TopUp),
          dateRangeStart = Some(tx6Date),
          dateRangeEnd = Some(tx9Date),
          sortFromNewestToOldest = Some(false)) shouldBe currency3Project2User2Transactions
          .filter(_.transactionType == TransactionType.TopUp)
          .filter(_.transactionDate >= tx6Date)
          .reverse

        fetchTransactions(
          projectId2,
          userId2,
          currencyId3,
          transactionTypes = Set(TransactionType.Withdraw),
          dateRangeStart = Some(tx6Date),
          dateRangeEnd = Some(tx9Date),
          sortFromNewestToOldest = Some(false)) shouldBe currency3Project2User2Transactions
          .filter(_.transactionType == TransactionType.Withdraw)
          .filter(_.transactionDate >= tx6Date)
          .reverse
      }
    }

    "not return transactions for currencies which are no longer associated with project" in {
      // GIVEN: we top up and withdraw funds for a currency associated with a given project
      // and ensure the transactions are visible
      val projectId1 = ProjectId.random()
      val projectId2 = ProjectId.random()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectId1, projectId2)

      val userId = UserId.random()
      val adminId1 = UserId.random()
      val adminId2 = UserId.random()
      val tx1Date = testClock.currentUtcOffsetDateTime()
      transferFunds(
        projectId1,
        userId,
        currencyId,
        PositiveBigDecimal(10.1),
        FundsTransferType.TopUpFunds,
        "new_tx1_id",
        "New Tx1 title",
        adminId1)
      testClock.moveTime()
      val tx2Date = testClock.currentUtcOffsetDateTime()
      transferFunds(
        projectId2,
        userId,
        currencyId,
        PositiveBigDecimal(7.6),
        FundsTransferType.WithdrawFunds,
        "new_tx2_id",
        "New Tx2 title",
        adminId2)

      val transactions = List(
        Transaction.forWithdraw(
          currencyId = currencyId,
          amount = BigDecimal(-7.6),
          projectId = projectId2,
          walletOwnerId = userId,
          requesterId = adminId2,
          externalTransactionId = "new_tx2_id",
          title = "New Tx2 title",
          transactionDate = tx2Date),
        Transaction.forTopUp(
          currencyId = currencyId,
          amount = PositiveBigDecimal(10.1),
          projectId = projectId1,
          walletOwnerId = userId,
          requesterId = adminId1,
          externalTransactionId = "new_tx1_id",
          title = "New Tx1 title",
          transactionDate = tx1Date))

      eventually {
        fetchTransactions(projectId1, userId, currencyId) shouldBe transactions
      }

      // WHEN: the currency association is removed and we fetch the transaction history
      // THEN: transactions are not visible
      deleteCurrencyFromProject(TestAuthContext(adminId1, projectId1), currencyId)
      fetchTransactionsWithNotFoundError(projectId1, userId, currencyId)

      // but they are visible via second project
      fetchTransactions(projectId2, userId, currencyId) shouldBe transactions
    }
  }
}
