package phoenix.payments.acceptance
import java.util.UUID

import scala.concurrent.duration._

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.CreateCashWithdrawal
import phoenix.payments.application.CreateCashWithdrawal._
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.PaymentsService
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.PunterDataGenerator.Api
import phoenix.punters.PunterDataGenerator.generateIpAddress
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.domain.Funds.RealMoney

final class CreateCashWithdrawalAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with KeycloakIntegrationSpec
    with DatabaseIntegrationSpec
    with FutureSupport
    with GivenWhenThen {

  private val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)

  private def createUseCase(paymentsService: PaymentsService = PaymentsServiceMock.successful()): CreateCashWithdrawal =
    new CreateCashWithdrawal(
      environment.puntersBC,
      environment.walletsBC,
      environment.authenticationRepository,
      environment.puntersRepository,
      environment.cashWithdrawalReservationsRepository,
      paymentsService,
      environment.paymentTransactions,
      environment.clock)

  def dateInTheFuture = environment.clock.currentOffsetDateTime().plusMonths(10)

  "CreateWithdrawal" when {

    "a Punter is active" should {

      "return reservation identifier if Punter has sufficient funds in their wallet" in {

        Given("an active Punter with money in their wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        val createCashWithdrawal = createUseCase()

        And("the Punter is logged in")
        awaitRight(
          environment.puntersBC.startSession(
            punter.punterId,
            SessionId.fromUUID(UUID.randomUUID()),
            dateInTheFuture,
            ipAddress = Some(generateIpAddress())))

        When("the Punter tries to withdraw an amount less than their balance")
        val result =
          awaitRight(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe()))

        Then("the Punter should receive a cash withdrawal identifier")
        result shouldBe a[CashWithdrawalIdentifier]
      }

      s"fail with ${PunterSessionNotFound.simpleObjectName} if punter is not logged in" in {
        Given("an active Punter with money in their wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        val createCashWithdrawal = createUseCase()

        When("the Punter tries to withdraw an amount less than their balance")
        val result =
          awaitLeft(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe()))

        Then("the Punter should receive an error")
        result shouldBe a[PunterSessionNotFound.type]
      }

      s"fail with ${InsufficientFunds.simpleObjectName} if requested amount is greater than the Punter's balance" in {

        Given("an active Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))

        And("the Punter is logged in")
        awaitRight(
          environment.puntersBC.startSession(
            punter.punterId,
            SessionId.fromUUID(UUID.randomUUID()),
            dateInTheFuture,
            Some(generateIpAddress())))

        When("the Punter tries to withdraw an amount greater than their balance")
        val createCashWithdrawal = createUseCase()
        val result =
          awaitLeft(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(10000)).unsafe()))

        Then("the Punter should receive an error")
        result shouldBe a[InsufficientFunds.type]
      }
    }

    "a Punter doesn't exist" should {

      s"fail with ${PunterProfileNotFound.simpleObjectName}" in {

        Given("a non-existent Punter")
        val createCashWithdrawal = createUseCase()

        When("the Punter tries to withdraw an amount less than their balance")
        val result = awaitLeft(
          createCashWithdrawal.forPunter(Api.generatePunterId(), PositiveAmount.ensure(RealMoney(100)).unsafe()))

        Then("the Punter should receive an error")
        result shouldBe a[PunterProfileNotFound.type]
      }
    }

    "a punter is self-excluded" should {

      "return reservation identifier if punter has sufficient funds" in {

        Given("a self-excluded Punter")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .beginSelfExclusion(punter.punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

        And("the Punter is logged in")
        awaitRight(
          environment.puntersBC.startSession(
            punter.punterId,
            SessionId.fromUUID(UUID.randomUUID()),
            dateInTheFuture,
            Some(generateIpAddress())))

        When("the Punter tries to withdraw")
        val createCashWithdrawal = createUseCase()
        val result =
          awaitRight(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe()))

        Then("the Punter should receive a reservation identifier")
        result shouldBe a[CashWithdrawalIdentifier]
      }

      s"fail with ${InsufficientFunds.simpleObjectName} if the punter doesn't have sufficient funds" in {

        Given("a self-excluded Punter")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .beginSelfExclusion(punter.punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.FiveYears)))

        And("the Punter is logged in")
        awaitRight(
          environment.puntersBC.startSession(
            punter.punterId,
            SessionId.fromUUID(UUID.randomUUID()),
            dateInTheFuture,
            Some(generateIpAddress())))

        When("the Punter tries to withdraw")
        val createCashWithdrawal = createUseCase()
        val result =
          awaitLeft(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(10000)).unsafe()))

        Then("the Punter should receive an error")
        result shouldBe a[InsufficientFunds.type]
      }
    }

    "a punter is in a cool-off period" should {

      "return reservation identifier if punter has sufficient funds" in {

        Given("a Punter in cool-off")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(environment.puntersBC.beginCoolOff(punter.punterId, 72.hours, CoolOffCause.SelfInitiated))

        And("the Punter is logged in")
        awaitRight(
          environment.puntersBC.startSession(
            punter.punterId,
            SessionId.fromUUID(UUID.randomUUID()),
            dateInTheFuture,
            Some(generateIpAddress())))

        When("the Punter tries to withdraw")
        val createCashWithdrawal = createUseCase()
        val result =
          awaitRight(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe()))

        Then("the Punter should receive a reservation identifier")
        result shouldBe a[CashWithdrawalIdentifier]
      }

      s"fail with ${InsufficientFunds.simpleObjectName} if the punter doesn't have sufficient funds" in {

        Given("a Punter in cool-off")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(environment.puntersBC.beginCoolOff(punter.punterId, 72.hours, CoolOffCause.SelfInitiated))

        And("the Punter is logged in")
        awaitRight(
          environment.puntersBC.startSession(
            punter.punterId,
            SessionId.fromUUID(UUID.randomUUID()),
            dateInTheFuture,
            Some(generateIpAddress())))

        When("the Punter tries to withdraw")
        val createCashWithdrawal = createUseCase()
        val result =
          awaitLeft(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(10000)).unsafe()))

        Then("the Punter should receive an error")
        result shouldBe a[InsufficientFunds.type]
      }
    }

    "a punter is suspended" should {

      s"fail with ${PunterSessionNotFound.simpleObjectName}" in {

        Given("a suspended Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .suspend(punter.punterId, OperatorSuspend("nasti boi"), suspendedAt = randomOffsetDateTime()))

        When("the Punter tries to withdraw")
        val createCashWithdrawal = createUseCase()
        val result =
          awaitLeft(createCashWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe()))

        Then("the Punter should receive an error")
        result shouldBe a[PunterSessionNotFound.type]
      }
    }
  }
}
