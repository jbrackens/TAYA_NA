package phoenix.wallets.integration

import java.time.OffsetDateTime

import scala.reflect.runtime.universe.typeTag
import scala.util.Random

import akka.stream.scaladsl.Sink
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.pagination.Pagination
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.punters.PunterDataGenerator.Api.generateAdminId
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.DataGenerator.randomString
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TruncatedTables
import phoenix.wallets.BetTransactionCategory.BetPlacement
import phoenix.wallets.BetTransactionCategory.BetSettlement
import phoenix.wallets.PaymentTransactionCategory.Deposit
import phoenix.wallets.PaymentTransactionCategory.Withdrawal
import phoenix.wallets.SlickWalletTransactionsRepository
import phoenix.wallets.TransactionCategory
import phoenix.wallets.WalletTransaction
import phoenix.wallets.WalletTransactionsRepository
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetLost
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetReason
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsReservedForBet
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsWithdrawn
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.PaymentReason
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletTransactionsQuery
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod.BackOfficeManualPaymentMethod
import phoenix.wallets.domain.PaymentMethod.BankTransferPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashDepositPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.ChequeWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.domain.PaymentMethod.NotApplicablePaymentMethod
import phoenix.wallets.support.InMemoryWalletTransactionsRepository
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

final class WalletTransactionsRepositorySpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with TruncatedTables {

  private val inMemoryRepository = () => new InMemoryWalletTransactionsRepository()
  private val slickRepository = () => {
    truncateTables()
    new SlickWalletTransactionsRepository(dbConfig)
  }

  "InMemoryWalletTransactionsRepository" should behave.like(walletTransactionsRepository(inMemoryRepository))
  "SlickWalletTransactionsRepository" should behave.like(walletTransactionsRepository(slickRepository))

  private def walletTransactionsRepository(emptyRepository: () => WalletTransactionsRepository): Unit = {
    val clock = Clock.utcClock

    "should find transactions by wallet id" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val walletId = generateWalletId()
      val expectedTransaction =
        paymentTransaction(walletId, reason = FundsDeposited, createdAt = clock.currentOffsetDateTime())
      await(objectUnderTest.save(expectedTransaction))

      // and
      await(
        objectUnderTest.save(
          paymentTransaction(generateWalletId(), reason = FundsDeposited, createdAt = clock.currentOffsetDateTime())))

      // when
      val query =
        WalletTransactionsQuery(walletId = walletId, timeRange = noTimeLimitation, categories = allCategories)

      val result = await(objectUnderTest.findPaginated(query, allRecords))

      // then
      result.data shouldBe List(expectedTransaction)
    }

    "should filter transactions by time range" in {
      // given
      val objectUnderTest = emptyRepository()

      val walletId = generateWalletId()
      val start = clock.currentOffsetDateTime().minusWeeks(1)
      val end = clock.currentOffsetDateTime().plusWeeks(1)

      // and
      val second = paymentTransaction(walletId, reason = FundsDeposited, createdAt = start.plusDays(1))
      await(objectUnderTest.save(second))

      val first = paymentTransaction(walletId, reason = FundsDeposited, createdAt = start)
      await(objectUnderTest.save(first))

      val third = paymentTransaction(walletId, reason = FundsDeposited, createdAt = end)
      await(objectUnderTest.save(third))

      // and
      await(
        objectUnderTest.save(paymentTransaction(walletId, reason = FundsDeposited, createdAt = start.minusSeconds(1))))

      await(objectUnderTest.save(paymentTransaction(walletId, reason = FundsDeposited, createdAt = end.plusSeconds(1))))

      // when
      val query =
        WalletTransactionsQuery(walletId = walletId, timeRange = TimeRange(start, end), categories = allCategories)

      val result = await(objectUnderTest.findPaginated(query, allRecords))

      // then
      result.data shouldBe List(third, second, first)
    }

    "should filter transactions by categories" in {
      // given
      val objectUnderTest = emptyRepository()

      val walletId = generateWalletId()
      val now = clock.currentOffsetDateTime()

      // and
      val deposit = paymentTransaction(walletId, reason = FundsDeposited, createdAt = now)
      await(objectUnderTest.save(deposit))

      val withdrawal =
        paymentTransaction(walletId, reason = FundsWithdrawn, createdAt = now)
      await(objectUnderTest.save(withdrawal))

      val betPlaced =
        betTransaction(walletId, reason = FundsReservedForBet, createdAt = now, reservationId = Some(randomString()))
      await(objectUnderTest.save(betPlaced))

      val betCancelled = betTransaction(walletId, reason = BetLost, createdAt = now)
      await(objectUnderTest.save(betCancelled))

      // when
      val withdrawalsAndBetSettlements = await(
        objectUnderTest.findPaginated(
          WalletTransactionsQuery(
            walletId = walletId,
            timeRange = noTimeLimitation,
            categories = Set(Withdrawal, BetSettlement)),
          allRecords))

      val depositsAndBetPlacements = await(
        objectUnderTest.findPaginated(
          WalletTransactionsQuery(
            walletId = walletId,
            timeRange = noTimeLimitation,
            categories = Set(Deposit, BetPlacement)),
          allRecords))

      // then
      withdrawalsAndBetSettlements.data.toSet shouldBe Set(withdrawal, betCancelled)
      depositsAndBetPlacements.data.toSet shouldBe Set(deposit, betPlaced)
    }

    "should stream transactions found by wallet id" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val walletId = generateWalletId()
      val expectedTransaction =
        paymentTransaction(walletId, reason = FundsDeposited, createdAt = clock.currentOffsetDateTime())
      await(objectUnderTest.save(expectedTransaction))

      // and
      await(
        objectUnderTest.save(
          paymentTransaction(generateWalletId(), reason = FundsDeposited, createdAt = clock.currentOffsetDateTime())))

      // when
      val query =
        WalletTransactionsQuery(walletId = walletId, timeRange = noTimeLimitation, categories = allCategories)

      val result = await(objectUnderTest.findAll(query).runWith(Sink.seq))

      // then
      result shouldBe List(expectedTransaction)
    }

    "should stream transactions filtered by time range" in {
      // given
      val objectUnderTest = emptyRepository()

      val walletId = generateWalletId()
      val start = clock.currentOffsetDateTime().minusWeeks(1)
      val end = clock.currentOffsetDateTime().plusWeeks(1)

      // and
      val second = paymentTransaction(walletId, reason = FundsDeposited, createdAt = start.plusDays(1))
      await(objectUnderTest.save(second))

      val first = paymentTransaction(walletId, reason = FundsDeposited, createdAt = start)
      await(objectUnderTest.save(first))

      val third = paymentTransaction(walletId, reason = FundsDeposited, createdAt = end)
      await(objectUnderTest.save(third))

      // and
      await(
        objectUnderTest.save(paymentTransaction(walletId, reason = FundsDeposited, createdAt = start.minusSeconds(1))))

      await(objectUnderTest.save(paymentTransaction(walletId, reason = FundsDeposited, createdAt = end.plusSeconds(1))))

      // when
      val query =
        WalletTransactionsQuery(walletId = walletId, timeRange = TimeRange(start, end), categories = allCategories)

      val result = await(objectUnderTest.findAll(query).runWith(Sink.seq))

      // then
      result shouldBe List(third, second, first)
    }

    "should stream transactions filtered by categories" in {
      // given
      val objectUnderTest = emptyRepository()

      val walletId = generateWalletId()
      val now = clock.currentOffsetDateTime()

      // and
      val deposit = paymentTransaction(walletId, reason = FundsDeposited, createdAt = now)
      await(objectUnderTest.save(deposit))

      val withdrawal =
        paymentTransaction(walletId, reason = FundsWithdrawn, createdAt = now)
      await(objectUnderTest.save(withdrawal))

      val betPlaced =
        betTransaction(walletId, reason = FundsReservedForBet, createdAt = now, reservationId = Some(randomString()))
      await(objectUnderTest.save(betPlaced))

      val betCancelled = betTransaction(walletId, reason = BetLost, createdAt = now)
      await(objectUnderTest.save(betCancelled))

      // when
      val withdrawalsAndBetSettlements = await(
        objectUnderTest
          .findAll(
            WalletTransactionsQuery(
              walletId = walletId,
              timeRange = noTimeLimitation,
              categories = Set(Withdrawal, BetSettlement)))
          .runWith(Sink.seq))

      val depositsAndBetPlacements = await(
        objectUnderTest
          .findAll(
            WalletTransactionsQuery(
              walletId = walletId,
              timeRange = noTimeLimitation,
              categories = Set(Deposit, BetPlacement)))
          .runWith(Sink.seq))

      // then
      withdrawalsAndBetSettlements.toSet shouldBe Set(withdrawal, betCancelled)
      depositsAndBetPlacements.toSet shouldBe Set(deposit, betPlaced)
    }

    "should handle pagination" in {
      // given
      val objectUnderTest = emptyRepository()

      val walletId = generateWalletId()
      val now = clock.currentOffsetDateTime()

      // and
      (1 to 5).foreach { _ =>
        await(objectUnderTest.save(paymentTransaction(walletId, reason = FundsDeposited, createdAt = now)))
      }

      // when
      val firstPage = await(
        objectUnderTest.findPaginated(
          WalletTransactionsQuery(walletId = walletId, timeRange = noTimeLimitation, categories = allCategories),
          Pagination(currentPage = 1, itemsPerPage = 2)))

      val secondPage = await(
        objectUnderTest.findPaginated(
          WalletTransactionsQuery(walletId = walletId, timeRange = noTimeLimitation, categories = allCategories),
          Pagination(currentPage = 2, itemsPerPage = 2)))

      val thirdPage = await(
        objectUnderTest.findPaginated(
          WalletTransactionsQuery(walletId = walletId, timeRange = noTimeLimitation, categories = allCategories),
          Pagination(currentPage = 3, itemsPerPage = 2)))

      // then
      firstPage.data should have size 2
      firstPage.totalCount shouldBe 5
      firstPage.hasNextPage shouldBe true

      secondPage.data should have size 2
      secondPage.totalCount shouldBe 5
      secondPage.hasNextPage shouldBe true

      thirdPage.data should have size 1
      thirdPage.totalCount shouldBe 5
      thirdPage.hasNextPage shouldBe false
    }

    "should calculate lifetime deposits" in {
      val repository = emptyRepository()

      val walletId = generateWalletId()

      val transactions = randomPaymentTransactions(walletId, 200)
      transactions.foreach(x => await(repository.save(x)))

      val lifetimeDeposits = await(repository.getLifetimeDeposits(walletId))
      lifetimeDeposits.value shouldBe transactions
        .filter(_.reason == FundsDeposited)
        .filterNot(_.paymentMethod.contains(NotApplicablePaymentMethod))
        .map(_.transactionAmount)
        .reduce(_ + _)
    }

    "should calculate lifetime withdrawals" in {
      val repository = emptyRepository()

      val walletId = generateWalletId()

      val transactions = randomPaymentTransactions(walletId, 200)
      transactions.foreach(x => await(repository.save(x)))

      val lifetimeWithdrawals = await(repository.getLifetimeWithdrawals(walletId))
      lifetimeWithdrawals.value shouldBe transactions
        .filter(transaction => transaction.reason == WithdrawalConfirmed || transaction.reason == FundsWithdrawn)
        .filterNot(_.paymentMethod.contains(NotApplicablePaymentMethod))
        .map(_.transactionAmount)
        .reduce(_ + _)
    }

    def randomPaymentTransactions(walletId: WalletId, size: Int): Seq[WalletTransaction] = {
      val paymentReasons =
        TransactionReason.values.filter(_.isInstanceOf[PaymentReason]).map(_.asInstanceOf[PaymentReason]).toVector
      val paymentMethods = Vector(
        CreditCardPaymentMethod,
        BankTransferPaymentMethod,
        CashWithdrawalPaymentMethod,
        CashDepositPaymentMethod,
        BackOfficeManualPaymentMethod("lala", generateAdminId()),
        ChequeWithdrawalPaymentMethod,
        NotApplicablePaymentMethod)
      paymentMethods.size shouldBe typeTag[PaymentMethod].tpe.typeSymbol.asClass.knownDirectSubclasses.size

      val now = clock.currentOffsetDateTime()
      (1 to size).map(
        _ =>
          paymentTransaction(
            walletId,
            paymentReasons(Random.nextInt(paymentReasons.size)),
            now,
            paymentMethod = Some(paymentMethods(Random.nextInt(paymentMethods.size)))))
    }

  }

  private def paymentTransaction(
      walletId: WalletId,
      reason: PaymentReason,
      createdAt: OffsetDateTime,
      reservationId: Option[String] = None,
      paymentMethod: Option[PaymentMethod] = Some(CreditCardPaymentMethod)): WalletTransaction =
    WalletTransaction(
      reservationId = reservationId,
      transactionId = randomString(),
      walletId = walletId,
      reason = reason,
      transactionAmount = DefaultCurrencyMoney(generateMoneyAmount()),
      createdAt = createdAt,
      preTransactionBalance = DefaultCurrencyMoney(generateMoneyAmount()),
      postTransactionBalance = DefaultCurrencyMoney(generateMoneyAmount()),
      betId = None,
      externalId = None,
      paymentMethod = paymentMethod)

  private def betTransaction(
      walletId: WalletId,
      reason: BetReason,
      createdAt: OffsetDateTime,
      reservationId: Option[String] = None): WalletTransaction =
    WalletTransaction(
      reservationId = reservationId,
      transactionId = randomString(),
      walletId = walletId,
      reason = reason,
      transactionAmount = DefaultCurrencyMoney(generateMoneyAmount()),
      createdAt = createdAt,
      preTransactionBalance = DefaultCurrencyMoney(generateMoneyAmount()),
      postTransactionBalance = DefaultCurrencyMoney(generateMoneyAmount()),
      betId = Some(generateBetId()),
      externalId = None,
      paymentMethod = None)

  private lazy val noTimeLimitation: TimeRange = TimeRange(start = OffsetDateTime.MIN, end = OffsetDateTime.MAX)
  private lazy val allCategories: Set[TransactionCategory] = TransactionCategory.values.toSet
  private lazy val allRecords: Pagination = Pagination(currentPage = 1, itemsPerPage = 1000000)
}
