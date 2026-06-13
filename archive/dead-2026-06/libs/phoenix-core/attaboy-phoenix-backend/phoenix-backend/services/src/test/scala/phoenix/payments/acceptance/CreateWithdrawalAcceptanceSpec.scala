package phoenix.payments.acceptance
import scala.concurrent.duration._

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.CreateWithdrawal
import phoenix.payments.application.CreateWithdrawal._
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentsService
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.PunterDataGenerator.Api
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
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

final class CreateWithdrawalAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with FutureSupport
    with GivenWhenThen {

  private val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  private val origin = PaymentOrigin("http://localhost")

  private def createUseCase(paymentsService: PaymentsService = PaymentsServiceMock.successful()): CreateWithdrawal =
    new CreateWithdrawal(
      environment.puntersBC,
      environment.walletsBC,
      environment.authenticationRepository,
      environment.puntersRepository,
      paymentsService,
      environment.paymentTransactions,
      environment.uuidGenerator)

  "CreateWithdrawal" when {

    "a Punter is active" should {

      "return redirection data if Punter has sufficient funds in their wallet" in {

        Given("an active Punter with money in their wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        val createWithdrawal = createUseCase()

        When("the Punter tries to withdraw an amount less than their balance")
        val result = awaitRight(
          createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive redirection data")
        result shouldBe a[PaymentSessionStarted]
      }

      s"fail with ${InsufficientFunds.simpleObjectName} if requested amount is greater than the Punter's balance" in {

        Given("an active Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))

        When("the Punter tries to deposit an amount greater than their balance")
        val createWithdrawal = createUseCase()
        val result = awaitLeft(
          createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(10000)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[InsufficientFunds.type]
      }
    }

    "a Punter doesn't exist" should {

      s"fail with ${PunterProfileNotFound.simpleObjectName}" in {

        Given("a non-existent Punter")
        val createWithdrawal = createUseCase()

        When("the Punter tries to withdraw an amount less than their balance")
        val result = awaitLeft(
          createWithdrawal.forPunter(Api.generatePunterId(), PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PunterProfileNotFound.type]
      }
    }

    "a registered user doesn't exist" should {

      s"fail with ${RegisteredUserNotFound.simpleObjectName}" in {

        Given("an Punter but no matching registered user")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        val createWithdrawal = createUseCase()

        When("the Punter tries to withdraw an amount less than their balance")
        val result =
          awaitLeft(createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[RegisteredUserNotFound.type]
      }
    }

    "a punter is self-excluded" should {

      "return redirection data if punter has sufficient funds" in {

        Given("a self-excluded Punter")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .beginSelfExclusion(punter.punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

        When("the Punter tries to deposit")
        val createWithdrawal = createUseCase()
        val result = awaitRight(
          createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PaymentSessionStarted]
      }

      s"fail with ${InsufficientFunds.simpleObjectName} if the punter doesn't have sufficient funds" in {

        Given("a self-excluded Punter")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .beginSelfExclusion(punter.punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.FiveYears)))

        When("the Punter tries to deposit")
        val createWithdrawal = createUseCase()
        val result = awaitLeft(
          createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(10000)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[InsufficientFunds.type]
      }
    }

    "a punter is in a cool-off period" should {

      "return redirection data if punter has sufficient funds" in {

        Given("a Punter in cool-off")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(environment.puntersBC.beginCoolOff(punter.punterId, 72.hours, CoolOffCause.SelfInitiated))

        When("the Punter tries to deposit")
        val createWithdrawal = createUseCase()
        val result = awaitRight(
          createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PaymentSessionStarted]
      }

      s"fail with ${InsufficientFunds.simpleObjectName} if the punter doesn't have sufficient funds" in {

        Given("a Punter in cool-off")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(environment.puntersBC.beginCoolOff(punter.punterId, 72.hours, CoolOffCause.SelfInitiated))

        When("the Punter tries to deposit")
        val createWithdrawal = createUseCase()
        val result = awaitLeft(
          createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(10000)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[InsufficientFunds.type]
      }
    }

    "a punter is suspended" should {

      s"fail with ${PunterIsNotAllowedToWithdraw.simpleObjectName}" in {

        Given("a suspended Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .suspend(punter.punterId, OperatorSuspend("Nasty nasty boi"), suspendedAt = randomOffsetDateTime()))

        When("the Punter tries to deposit")
        val createWithdrawal = createUseCase()
        val result =
          awaitLeft(createWithdrawal.forPunter(punter.punterId, PositiveAmount.ensure(RealMoney(100)).unsafe(), origin))

        Then("the Punter should receive an error")
        result shouldBe a[PunterIsNotAllowedToWithdraw.type]
      }
    }
  }
}
