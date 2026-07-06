package phoenix.payments.acceptance
import org.scalatest.GivenWhenThen
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.domain
import phoenix.payments.domain.CreationType
import phoenix.payments.domain.CreationType.User
import phoenix.payments.domain.PaymentMethod
import phoenix.payments.domain.PaymentMethod.VisaWithdrawal
import phoenix.payments.domain.StateDefinition
import phoenix.payments.domain.StateDefinition.Created
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentId
import phoenix.payments.support.PaymentsDataGenerator.generateTransactionId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.domain.Funds.RealMoney

final class HandlingWithdrawalNotificationsAcceptanceSpec
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

  private val ValidMinWithdrawal = BigDecimal(1)

  "HandlePXPNotification" when {
    "handling withdrawal created notification" should {
      "process notification in case punter can withdraw" in {
        Given("a punter with money in his wallet")
        val balance = DefaultCurrencyMoney(2137)
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = balance)

        When("received a notification")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(ValidMinWithdrawal)).unsafe(),
          paymentMethod = VisaWithdrawal,
          stateDefinition = Created,
          creationType = User)

        Then("it should respond with success")
        noException should be thrownBy awaitRight(objectUnderTest.handle(withdrawalCreated))

        And("should reserve wallet funds")
        val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))
        currentBalance.realMoney shouldBe RealMoney(balance.amount - ValidMinWithdrawal)

        And("should mark transaction as pending")
        val transaction = await(environment.paymentTransactions.find(punter.punterId, withdrawalCreated.transactionId))
        transaction.value.status shouldBe TransactionStatus.Pending
      }

      "respond with an error in case punter not allowed to withdraw" in {
        Given("a suspended Punter")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .suspend(punter.punterId, OperatorSuspend("because reasons"), suspendedAt = randomOffsetDateTime()))

        When("received a notification")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(ValidMinWithdrawal)).unsafe(),
          paymentMethod = PaymentMethod.VisaWithdrawal,
          stateDefinition = StateDefinition.Created,
          creationType = CreationType.User)

        val attempt = awaitLeft(objectUnderTest.handle(withdrawalCreated))

        Then("it should respond with an error")
        attempt shouldBe a[RefusedByRiskManagement]
      }

      "respond with an error in case punter does not have enough funds" in {
        Given("a punter with money in his wallet")
        val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))

        When("received a notification")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(2138)).unsafe(),
          paymentMethod = PaymentMethod.VisaWithdrawal,
          stateDefinition = StateDefinition.Created,
          creationType = CreationType.User)

        val attempt = awaitLeft(objectUnderTest.handle(withdrawalCreated))

        Then("it should respond with an error")
        attempt shouldBe a[RefusedByRiskManagement]
      }

      "respond with an error if there's no such punter" in {
        When("received a notification")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
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

    "handling withdrawal confirmation notification" should {
      "process notification successfully" in {
        Given("a punter with money in his wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))

        And("withdrawal started")
        val transactionId = generateTransactionId()
        val paymentId = generatePaymentId()

        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = transactionId,
          paymentId = paymentId,
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(2137)).unsafe(),
          paymentMethod = PaymentMethod.VisaWithdrawal,
          stateDefinition = StateDefinition.Created,
          creationType = CreationType.User)

        awaitRight(objectUnderTest.handle(withdrawalCreated))

        When("received a notification")
        val withdrawalConfirmed = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = transactionId,
          paymentId = paymentId,
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(2137)).unsafe(),
          paymentMethod = PaymentMethod.VisaWithdrawal,
          stateDefinition = StateDefinition.WithdrawnByProvider,
          creationType = CreationType.User)

        Then("it should be processed successfully")
        noException shouldBe thrownBy(awaitRight(objectUnderTest.handle(withdrawalConfirmed)))

        And("transaction should be marked as succeeded")
        val transaction =
          await(environment.paymentTransactions.find(punter.punterId, withdrawalConfirmed.transactionId))
        transaction.value.status shouldBe TransactionStatus.Succeeded
      }
    }

    "handling withdrawal rejection notification" should {
      "process notification successfully" in {
        Given("a punter with money in his wallet")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))

        And("withdrawal started")
        val transactionId = generateTransactionId()
        val paymentId = generatePaymentId()

        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = transactionId,
          paymentId = paymentId,
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(ValidMinWithdrawal)).unsafe(),
          paymentMethod = PaymentMethod.VisaWithdrawal,
          stateDefinition = StateDefinition.Created,
          creationType = CreationType.User)

        awaitRight(objectUnderTest.handle(withdrawalCreated))

        When("received a notification")
        val withdrawalRefused = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = transactionId,
          paymentId = paymentId,
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(ValidMinWithdrawal)).unsafe(),
          paymentMethod = PaymentMethod.VisaWithdrawal,
          stateDefinition = StateDefinition.RefusedByProvider,
          creationType = CreationType.User)

        Then("it should be processed successfully")
        noException shouldBe thrownBy(awaitRight(objectUnderTest.handle(withdrawalRefused)))

        And("wallet funds should be freed back")
        val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))
        currentBalance.realMoney shouldBe RealMoney(2137)

        And("transaction should be marked as failed")
        val transaction =
          await(environment.paymentTransactions.find(punter.punterId, withdrawalRefused.transactionId))
        transaction.value.status shouldBe TransactionStatus.Refused
      }
    }
  }
}
