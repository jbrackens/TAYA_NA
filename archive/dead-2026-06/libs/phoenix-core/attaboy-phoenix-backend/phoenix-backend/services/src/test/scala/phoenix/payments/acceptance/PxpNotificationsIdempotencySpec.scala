package phoenix.payments.acceptance
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.domain.CreationType.User
import phoenix.payments.domain.PaymentMethod.VisaDeposit
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition.AuthorisedByProvider
import phoenix.payments.domain.StateDefinition.PendingToBeCaptured
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentId
import phoenix.payments.support.PaymentsDataGenerator.generateTransactionId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.domain.Funds.RealMoney

final class PxpNotificationsIdempotencySpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with FutureSupport
    with GivenWhenThen {

  private val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  private val objectUnderTest = environment.paymentsModule.commands.handlePXPNotification

  "HandlePXPNotification" when {
    "handling pxp notification" should {
      "process it only once if it's been already accepted" in {
        Given("a punter with money in his wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))

        When("received a notification")
        val depositConfirmed = PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = VisaDeposit,
          stateDefinition = PendingToBeCaptured,
          creationType = User)

        And("processing it twice")
        awaitRight(objectUnderTest.handle(depositConfirmed))
        awaitRight(objectUnderTest.handle(depositConfirmed))

        Then("effectively it should only increase punter's balance once")
        val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))
        currentBalance.realMoney shouldBe RealMoney(2158.37)
      }

      "process it only once if it's been rejected due to risk management" in {
        Given("a suspended Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .suspend(punter.punterId, OperatorSuspend("nasti boi"), suspendedAt = randomOffsetDateTime()))

        And("already refused notification")
        val notification = PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = VisaDeposit,
          stateDefinition = AuthorisedByProvider,
          creationType = User)

        val firstAttempt = awaitLeft(objectUnderTest.handle(notification))
        firstAttempt shouldBe a[RefusedByRiskManagement]

        When("punter unsuspended")
        awaitRight(environment.puntersBC.unsuspend(punter.punterId, AdminId("test")))

        And("notification processed again")
        val secondAttempt = awaitLeft(objectUnderTest.handle(notification))

        Then("it should respond with previous response, even though punter can deposit now")
        secondAttempt shouldBe a[RefusedByRiskManagement]
      }

      "process it again in case of a transient error" in {
        Given("a notification attempt before punter profile even exist, causing a transient error")
        val punterId = generatePunterId()
        val notification = PaymentStateChangedNotification(
          punterId = punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = VisaDeposit,
          stateDefinition = PendingToBeCaptured,
          creationType = User)

        val firstAttempt = awaitLeft(objectUnderTest.handle(notification))
        firstAttempt shouldBe a[ProcessingError]

        When("transient error fixed")
        environment.punterScenarios.punterWithWallet(punterId = punterId, initialBalance = DefaultCurrencyMoney(2137))

        Then("retry should succeed")
        noException shouldBe thrownBy(awaitRight(objectUnderTest.handle(notification)))
      }
    }
  }
}
