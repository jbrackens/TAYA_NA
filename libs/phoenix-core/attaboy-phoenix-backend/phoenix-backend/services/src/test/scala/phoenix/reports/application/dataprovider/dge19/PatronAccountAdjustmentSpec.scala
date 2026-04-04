package phoenix.reports.application.dataprovider.dge19
import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.TransactionFinder
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.definition.Fields.TimeField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.model.wallets.TransactionType.Deposit
import phoenix.reports.domain.model.wallets.TransactionType.Withdrawal
import phoenix.reports.domain.template.dge19.PatronAccountAdjustment.PatronAccountAdjustmentRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.infrastructure.InMemoryWalletTransactionRepository
import phoenix.support.DataGenerator.randomString
import phoenix.support.FutureSupport
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

final class PatronAccountAdjustmentSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  val clock: Clock = Clock.utcClock

  "A PatronAccountAdjustment" should {
    "correctly calculate per-fixture stats" in {
      // given
      val dayOfEvent = ReportingPeriod.enclosingDay(clock.currentOffsetDateTime(), clock)
      val repository = new InMemoryWalletTransactionRepository()
      val puntersRepository = new InMemoryPuntersRepository()

      val firstPunterId = generatePunterId()
      val secondPunterId = generatePunterId()
      val backofficeUserId = generatePunterId()
      val punterProfile = PunterProfile(
        firstPunterId,
        generatePunterName(),
        false,
        ActivationPath.Manual,
        suspensionReason = None,
        verifiedAt = None,
        verifiedBy = None)
      val punterProfile2 = PunterProfile(
        secondPunterId,
        generatePunterName(),
        false,
        ActivationPath.Manual,
        suspensionReason = None,
        verifiedAt = None,
        verifiedBy = None)
      val adminProfile = PunterProfile(
        backofficeUserId,
        generatePunterName(),
        false,
        ActivationPath.Manual,
        suspensionReason = None,
        verifiedAt = None,
        verifiedBy = None)

      await(puntersRepository.upsert(punterProfile))
      await(puntersRepository.upsert(punterProfile2))
      await(puntersRepository.upsert(adminProfile))

      val firstTransaction = WalletTransaction(
        transactionId = randomString(),
        punterId = firstPunterId,
        amount = MoneyAmount(100),
        transactionType = Deposit,
        transactionReason = TransactionReason.AdjustingFundsDeposited,
        startedAt = dayOfEvent.periodStart.plusHours(1),
        closedAt = Some(dayOfEvent.periodStart.plusHours(2)),
        backofficeUserId = Some(AdminId.fromPunterId(backofficeUserId)),
        details = Some("detail"))

      val secondTransaction = WalletTransaction(
        transactionId = randomString(),
        punterId = secondPunterId,
        amount = MoneyAmount(500),
        transactionType = Withdrawal,
        transactionReason = TransactionReason.AdjustingFundsWithdrawn,
        startedAt = dayOfEvent.periodStart.plusHours(2),
        closedAt = Some(dayOfEvent.periodStart.plusHours(3)),
        backofficeUserId = Some(AdminId.fromPunterId(backofficeUserId)),
        details = Some("detail2"))

      val thirdTransaction = WalletTransaction(
        transactionId = randomString(),
        punterId = secondPunterId,
        amount = MoneyAmount(1500),
        transactionType = Deposit,
        transactionReason = TransactionReason.AdjustingFundsDeposited,
        startedAt = dayOfEvent.periodStart.minusDays(1).plusHours(2),
        closedAt = Some(dayOfEvent.periodStart.minusDays(1).plusHours(3)),
        backofficeUserId = Some(AdminId.fromPunterId(backofficeUserId)),
        details = Some("detail2"))

      val fourthTransaction = WalletTransaction(
        transactionId = randomString(),
        punterId = secondPunterId,
        amount = MoneyAmount(300),
        transactionType = Deposit,
        transactionReason = TransactionReason.AdjustingFundsDeposited,
        startedAt = dayOfEvent.periodStart.minusDays(1).plusHours(2),
        closedAt = Some(dayOfEvent.periodStart.minusDays(1).plusHours(3)),
        backofficeUserId = Some(AdminId.fromPunterId(backofficeUserId)),
        details = Some("detail2"))

      await(repository.upsert(firstTransaction))
      await(repository.upsert(secondTransaction))
      await(repository.upsert(thirdTransaction))
      await(repository.upsert(fourthTransaction))

      // and
      val objectUnderTest =
        new PatronAccountAdjustmentData(new TransactionFinder(repository), new PuntersFinder(puntersRepository))

      // when
      val rows = await(objectUnderTest.getData(dayOfEvent))

      // then
      rows should have size 2

      // and
      rows.find(_.patronId.value == firstPunterId) shouldBe
      Some(
        PatronAccountAdjustmentRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronName = StringField(punterProfile.punterName),
          patronId = PatronIdField(firstPunterId),
          accountDesignation = AccountDesignationField(RealAccount),
          transactionTime = TimeField(firstTransaction.startedAt),
          adjusterName = StringField(adminProfile.punterName),
          adjustmentReason = StringField(firstTransaction.details.get),
          cashableAmount = MoneyField(firstTransaction.amount.amount),
          nonCashableAmount = MoneyField(0)))

      // and
      rows.find(_.patronId.value == secondPunterId) shouldBe
      Some(
        PatronAccountAdjustmentRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronName = StringField(punterProfile2.punterName),
          patronId = PatronIdField(secondPunterId),
          accountDesignation = AccountDesignationField(RealAccount),
          transactionTime = TimeField(secondTransaction.startedAt),
          adjusterName = StringField(adminProfile.punterName),
          adjustmentReason = StringField(secondTransaction.details.get),
          cashableAmount = MoneyField(-secondTransaction.amount.amount),
          nonCashableAmount = MoneyField(0)))
    }

    "produce empty report if there's no data" in {
      // given
      val repository = new InMemoryWalletTransactionRepository()
      val puntersRepository = new InMemoryPuntersRepository()

      val objectUnderTest =
        new PatronAccountAdjustmentData(new TransactionFinder(repository), new PuntersFinder(puntersRepository))

      // when
      val dayOfEvent = ReportingPeriod.enclosingDay(clock.currentOffsetDateTime(), clock)
      val reportRows = await(objectUnderTest.getData(dayOfEvent))

      //
      reportRows shouldBe empty
    }
  }
}
