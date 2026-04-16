package phoenix.payments.acceptance

import org.scalatest.GivenWhenThen
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.domain.CreationType
import phoenix.payments.domain.CreationType.User
import phoenix.payments.domain.PaymentMethod
import phoenix.payments.domain.PaymentMethod.VisaDeposit
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition
import phoenix.payments.domain.StateDefinition.AuthorisedByProvider
import phoenix.payments.domain.StateDefinition.Cancelled
import phoenix.payments.domain.StateDefinition.PendingToBeCaptured
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentId
import phoenix.payments.support.PaymentsDataGenerator.generateTransactionId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.Limit.Daily
import phoenix.punters.domain.Limit.Monthly
import phoenix.punters.domain.Limit.Weekly
import phoenix.punters.domain.Limits
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod

final class HandlingDepositNotificationsAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with OptionValues
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with FutureSupport
    with GivenWhenThen {

  private val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  private val objectUnderTest = environment.paymentsModule.commands.handlePXPNotification

  "HandlePXPNotification" when {
    "handling deposit AuthorizedByProvider notification" should {
      "process notification in case punter can deposit" in {
        Given("a punter with money in his wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))

        When("received a notification")
        val depositAttempt = PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = VisaDeposit,
          stateDefinition = AuthorisedByProvider,
          creationType = User)

        Then("it should respond with success")
        noException should be thrownBy awaitRight(objectUnderTest.handle(depositAttempt))

        And("it should mark transaction as pending")
        val transaction = await(environment.paymentTransactions.find(punter.punterId, depositAttempt.transactionId))
        transaction.value.status shouldBe TransactionStatus.Pending
      }

      "respond with an error in case punter not allowed to deposit" in {
        Given("a suspended Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .suspend(punter.punterId, OperatorSuspend("nasti boi"), suspendedAt = randomOffsetDateTime()))

        When("received a notification")
        val depositAttempt = PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = VisaDeposit,
          stateDefinition = AuthorisedByProvider,
          creationType = User)

        val attempt = awaitLeft(objectUnderTest.handle(depositAttempt))

        Then("it should respond with an error")
        attempt shouldBe a[RefusedByRiskManagement]
      }

      "respond with an error in case punter reached deposit limits" in {
        Given("a punter with money in his wallet")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))

        And("deposit limits reached")
        awaitRight(
          environment.puntersBC.setDepositLimits(
            punter.punterId,
            Limits.unsafe(Daily(Some(DepositLimitAmount(MoneyAmount(10)))), Weekly(None), Monthly(None))))

        awaitRight(
          environment.walletsBC.deposit(
            WalletId.deriveFrom(punter.punterId),
            PositiveAmount.ensure(RealMoney(10)).unsafe(),
            CreditFundsReason.Deposit,
            CreditCardPaymentMethod))

        When("received a notification")
        val depositAttempt = PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = VisaDeposit,
          stateDefinition = AuthorisedByProvider,
          creationType = User)

        val attempt = awaitLeft(objectUnderTest.handle(depositAttempt))

        Then("it should respond with an error")
        attempt shouldBe a[RefusedByRiskManagement]
      }

      "respond with an error if there's no such punter" in {
        When("received a notification")
        val withdrawalCreated = PaymentStateChangedNotification(
          punterId = generatePunterId(),
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(2137)).unsafe(),
          paymentMethod = PaymentMethod.VisaWithdrawal,
          stateDefinition = StateDefinition.Created,
          creationType = CreationType.User)

        val attempt = awaitLeft(objectUnderTest.handle(withdrawalCreated))

        Then("it should respond with an error")
        attempt shouldBe a[ProcessingError]
      }
    }

    "handling deposit PendingToBeCaptured notification" should {
      "process notification successfully" in {
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

        Then("it should respond with success")
        noException should be thrownBy awaitRight(objectUnderTest.handle(depositConfirmed))

        And("it should increase punter's balance")
        val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))
        currentBalance.realMoney shouldBe RealMoney(2158.37)

        And("mark transaction as succeeded")
        val transaction = await(environment.paymentTransactions.find(punter.punterId, depositConfirmed.transactionId))
        transaction.value.status shouldBe TransactionStatus.Succeeded
      }
    }

    "handling deposit Cancelled notification" should {
      "process notification successfully" in {
        Given("a punter with money in his wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))

        When("received a notification")
        val depositCancelled = PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = VisaDeposit,
          stateDefinition = Cancelled,
          creationType = User)

        Then("it should respond with success")
        noException should be thrownBy awaitRight(objectUnderTest.handle(depositCancelled))

        And("mark transaction as failed")
        val transaction = await(environment.paymentTransactions.find(punter.punterId, depositCancelled.transactionId))
        transaction.value.status shouldBe TransactionStatus.Cancelled
      }
    }
  }
}
