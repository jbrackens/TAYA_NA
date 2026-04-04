package phoenix.payments.acceptance

import scala.concurrent.duration._

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.CreateDeposit
import phoenix.payments.application.CreateDeposit._
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentsService
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.PunterDataGenerator.Api
import phoenix.punters.PunterDataGenerator.createDepositLimitAmount
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.Limit
import phoenix.punters.domain.Limits
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.domain.Funds.RealMoney

final class CreateDepositAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with FutureSupport
    with GivenWhenThen {

  private val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  private val origin = PaymentOrigin("http://localhost")

  private def createUseCase(paymentsService: PaymentsService = PaymentsServiceMock.successful()): CreateDeposit =
    new CreateDeposit(
      environment.puntersBC,
      environment.walletsBC,
      environment.authenticationRepository,
      environment.puntersRepository,
      paymentsService,
      environment.paymentTransactions,
      environment.uuidGenerator)

  "CreateDeposit" when {

    "a punter is active" should {

      "return redirection data if limits aren't exceeded" in {

        Given("an active Punter with money in their wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        val createDeposit = createUseCase()

        When("the Punter tries to deposit")
        val result =
          awaitRight(createDeposit.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive redirection data")
        result shouldBe a[PaymentSessionStarted]
      }

      s"fail with ${DepositAmountExceedsLimit.simpleObjectName} if amount exceeds a deposit limit" in {

        Given("an active Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))

        And("the Punter has set a deposit limit")
        val depositLimits = Limits.unsafe(
          Limit.Daily(Some(createDepositLimitAmount(3))),
          Limit.Weekly(Some(createDepositLimitAmount(10))),
          Limit.Monthly(Some(createDepositLimitAmount(30))))
        awaitRight(environment.puntersBC.setDepositLimits(punter.punterId, depositLimits))

        When("the Punter tries to deposit an amount greater than the limit")
        val createDeposit = createUseCase()
        val result =
          awaitLeft(createDeposit.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[DepositAmountExceedsLimit.type]
      }
    }

    "punter is non-existent" should {

      s"fail with ${PunterProfileNotFound.simpleObjectName}" in {

        Given("a non-existent Punter")
        val createDeposit = createUseCase()

        When("the Punter tries to withdraw an amount less than their balance")
        val result = awaitLeft(
          createDeposit.forPunter(Api.generatePunterId(), PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PunterProfileNotFound.type]
      }
    }

    "registered user is non-existent" should {

      s"fail with ${RegisteredUserNotFound.simpleObjectName}" in {

        Given("an Punter but no matching registered user")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        val createDeposit = createUseCase()

        When("the Punter tries to deposit")
        val result =
          awaitLeft(createDeposit.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[RegisteredUserNotFound.type]
      }
    }

    "a punter is suspended" should {

      s"fail with ${PunterIsNotAllowedToDeposit.simpleObjectName}" in {

        Given("a suspended Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .suspend(punter.punterId, OperatorSuspend("not today"), suspendedAt = randomOffsetDateTime()))

        When("the Punter tries to deposit")
        val createDeposit = createUseCase()
        val result =
          awaitLeft(createDeposit.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PunterIsNotAllowedToDeposit.type]
      }
    }

    "a punter is self-excluded" should {

      s"fail with ${PunterIsNotAllowedToDeposit.simpleObjectName}" in {

        Given("a self-excluded Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .beginSelfExclusion(punter.punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.FiveYears)))

        When("the Punter tries to deposit")
        val createDeposit = createUseCase()
        val result =
          awaitLeft(createDeposit.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PunterIsNotAllowedToDeposit.type]
      }
    }

    "a punter is in a cool-off period" should {

      s"fail with ${PunterIsNotAllowedToDeposit.simpleObjectName}" in {

        Given("a Punter in cool-off")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(environment.puntersBC.beginCoolOff(punter.punterId, 72.hours, CoolOffCause.SelfInitiated))

        When("the Punter tries to deposit")
        val createDeposit = createUseCase()
        val result =
          awaitLeft(createDeposit.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PunterIsNotAllowedToDeposit.type]
      }
    }
  }
}
