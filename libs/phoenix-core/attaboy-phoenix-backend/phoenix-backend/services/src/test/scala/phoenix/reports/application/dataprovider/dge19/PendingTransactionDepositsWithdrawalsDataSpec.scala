package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.TransactionFinder
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.DateTimeField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.NumberField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.TransactionTypeField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.model.punter.AccountDesignation.TestAccount
import phoenix.reports.domain.model.wallets.TransactionType.Deposit
import phoenix.reports.domain.model.wallets.TransactionType.Withdrawal
import phoenix.reports.domain.template.dge19.PendingTransactionDepositsWithdrawals.PendingTransactionDepositsWithdrawalsRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.infrastructure.InMemoryWalletTransactionRepository
import phoenix.support.DataGenerator.generateIdentifier
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

final class PendingTransactionDepositsWithdrawalsDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with GivenWhenThen {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)

  private val hardcodedClock = new FakeHardcodedClock(OffsetDateTime.of(2021, 2, 20, 1, 0, 0, 0, ZoneOffset.UTC))
  private val givenReportingPeriod =
    ReportingPeriod.enclosingDay(hardcodedClock.currentOffsetDateTime(), hardcodedClock)

  "A PendingTransactionDepositsWithdrawalsData" should {
    "produce empty report for no data" in {
      Given("no transactions returned by repository")
      val repository = new InMemoryWalletTransactionRepository()
      val puntersRepository = new InMemoryPuntersRepository()

      val objectUnderTest = new PendingTransactionDepositsWithdrawalsData(
        new TransactionFinder(repository),
        new PuntersFinder(puntersRepository))

      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("report should be empty")
      result.size should be(0)
    }

    "present each transaction individually" in {
      Given("repository with 3 open transactions")
      val repository = new InMemoryWalletTransactionRepository()
      val puntersRepository = new InMemoryPuntersRepository()

      val tran1DuringReportingPeriod = WalletTransaction(
        generateIdentifier(),
        generatePunterId(),
        generateMoneyAmount(),
        Withdrawal,
        TransactionReason.FundsWithdrawn,
        givenReportingPeriod.periodStart,
        None,
        None,
        None)
      val tran2BeforeReportingPeriod = WalletTransaction(
        generateIdentifier(),
        generatePunterId(),
        generateMoneyAmount(),
        Deposit,
        TransactionReason.FundsDeposited,
        givenReportingPeriod.periodStart.minusNanos(1),
        None,
        None,
        None)
      val tran3LongBeforeReportingPeriod = WalletTransaction(
        generateIdentifier(),
        generatePunterId(),
        generateMoneyAmount(),
        Deposit,
        TransactionReason.FundsDeposited,
        givenReportingPeriod.periodEnd.minusDays(10).minusHours(5),
        None,
        None,
        None)
      val tran4LongBeforeReportingPeriod = WalletTransaction(
        generateIdentifier(),
        generatePunterId(),
        generateMoneyAmount(),
        Deposit,
        TransactionReason.FundsDeposited,
        givenReportingPeriod.periodEnd.minusDays(10).minusHours(5),
        None,
        None,
        None)

      await(repository.upsert(tran1DuringReportingPeriod))
      await(repository.upsert(tran2BeforeReportingPeriod))
      await(repository.upsert(tran3LongBeforeReportingPeriod))
      await(repository.upsert(tran4LongBeforeReportingPeriod))
      await(
        puntersRepository.upsert(
          PunterProfile(
            tran1DuringReportingPeriod.punterId,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      await(
        puntersRepository.upsert(
          PunterProfile(
            tran2BeforeReportingPeriod.punterId,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      await(
        puntersRepository.upsert(
          PunterProfile(
            tran3LongBeforeReportingPeriod.punterId,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      await(
        puntersRepository.upsert(
          PunterProfile(
            tran4LongBeforeReportingPeriod.punterId,
            generatePunterName(),
            true,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))

      val objectUnderTest = new PendingTransactionDepositsWithdrawalsData(
        new TransactionFinder(repository),
        new PuntersFinder(puntersRepository))

      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("report should have 4 rows")
      result.size should be(4)

      result(0) shouldBe
      PendingTransactionDepositsWithdrawalsRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(tran3LongBeforeReportingPeriod.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        transactionDateTime = DateTimeField(tran3LongBeforeReportingPeriod.startedAt),
        transactionType = TransactionTypeField(tran3LongBeforeReportingPeriod.transactionType),
        transactionAmount = MoneyField(tran3LongBeforeReportingPeriod.amount.amount),
        daysOutstanding = NumberField(10))

      result(1) shouldBe
      PendingTransactionDepositsWithdrawalsRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(tran4LongBeforeReportingPeriod.punterId),
        accountDesignation = AccountDesignationField(TestAccount),
        transactionDateTime = DateTimeField(tran4LongBeforeReportingPeriod.startedAt),
        transactionType = TransactionTypeField(tran4LongBeforeReportingPeriod.transactionType),
        transactionAmount = MoneyField(tran4LongBeforeReportingPeriod.amount.amount),
        daysOutstanding = NumberField(10))

      result(2) shouldBe
      PendingTransactionDepositsWithdrawalsRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(tran2BeforeReportingPeriod.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        transactionDateTime = DateTimeField(tran2BeforeReportingPeriod.startedAt),
        transactionType = TransactionTypeField(tran2BeforeReportingPeriod.transactionType),
        transactionAmount = MoneyField(tran2BeforeReportingPeriod.amount.amount),
        daysOutstanding = NumberField(1))

      result(3) shouldBe
      PendingTransactionDepositsWithdrawalsRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(tran1DuringReportingPeriod.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        transactionDateTime = DateTimeField(tran1DuringReportingPeriod.startedAt),
        transactionType = TransactionTypeField(tran1DuringReportingPeriod.transactionType),
        transactionAmount = MoneyField(tran1DuringReportingPeriod.amount.amount),
        daysOutstanding = NumberField(0))
    }
  }
}
