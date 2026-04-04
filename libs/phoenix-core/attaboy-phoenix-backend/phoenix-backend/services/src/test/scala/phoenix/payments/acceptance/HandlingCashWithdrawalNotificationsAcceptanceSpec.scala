package phoenix.payments.acceptance

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.domain
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.CreationType.User
import phoenix.payments.domain.PaymentMethod.CashWithdrawal
import phoenix.payments.domain.StateDefinition.Expired
import phoenix.payments.domain.StateDefinition.WithdrawnToUser
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
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod

class HandlingCashWithdrawalNotificationsAcceptanceSpec
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
    "handling cash withdrawn to user" should {
      "process CONFIRMATION if withdrawal reservation exists" in {

        Given("a punter with money in his wallet")
        val balance = DefaultCurrencyMoney(2137)
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = balance)

        And("a withdrawal reservation")
        val identifier = CashWithdrawalIdentifier.create()

        awaitRight(
          environment.walletsBC.reserveForWithdrawal(
            WalletId.deriveFrom(punter.punterId),
            WithdrawalReservation(
              identifier.asReservation,
              PositiveAmount.ensure(RealMoney(51.37)).unsafe(),
              PaymentMethod.CashWithdrawalPaymentMethod)))

        When("a notification is received")
        val withdrawnToUser = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = identifier.asTransaction,
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(51.37)).unsafe(),
          paymentMethod = CashWithdrawal,
          stateDefinition = WithdrawnToUser,
          creationType = User)

        Then("it should respond with success")
        noException should be thrownBy awaitRight(objectUnderTest.handle(withdrawnToUser))
      }

      "respond with an error in case punter not allowed to withdraw" in {
        Given("a punter with money in his wallet")
        val balance = DefaultCurrencyMoney(2137)
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = balance)

        And("a withdrawal reservation")
        val identifier = CashWithdrawalIdentifier.create()

        awaitRight(
          environment.walletsBC.reserveForWithdrawal(
            WalletId.deriveFrom(punter.punterId),
            WithdrawalReservation(
              identifier.asReservation,
              PositiveAmount.ensure(RealMoney(balance)).unsafe(),
              PaymentMethod.CashWithdrawalPaymentMethod)))

        When("the punter is suspended")
        awaitRight(
          environment.puntersBC
            .suspend(punter.punterId, OperatorSuspend("nasti nasti boi"), suspendedAt = randomOffsetDateTime()))

        And("a payment notification is received")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = identifier.asTransaction,
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(51.37)).unsafe(),
          paymentMethod = CashWithdrawal,
          stateDefinition = WithdrawnToUser,
          creationType = User)

        val attempt = awaitLeft(objectUnderTest.handle(withdrawalCreated))

        Then("it should respond with an error")
        attempt shouldBe a[RefusedByRiskManagement]
      }

      "respond with an error in case withdraw amount is less than 50" in {
        Given("a punter with money in his wallet")
        val balance = DefaultCurrencyMoney(2137)
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = balance)

        And("a withdrawal reservation")
        val identifier = CashWithdrawalIdentifier.create()

        And("a payment notification is received")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = identifier.asTransaction,
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
          paymentMethod = CashWithdrawal,
          stateDefinition = WithdrawnToUser,
          creationType = User)

        val attempt = awaitLeft(objectUnderTest.handle(withdrawalCreated))

        Then("it should respond with an error")
        attempt shouldBe a[RefusedByRiskManagement]
      }

      "respond with an error if there's no such reservation" in {
        Given("a punter with money in his wallet")
        val balance = DefaultCurrencyMoney(2137)
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = balance)

        And("a payment notification is received")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = punter.punterId,
          transactionId = CashWithdrawalIdentifier.create().asTransaction,
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(51.37)).unsafe(),
          paymentMethod = CashWithdrawal,
          stateDefinition = WithdrawnToUser,
          creationType = User)

        val attempt = awaitLeft(objectUnderTest.handle(withdrawalCreated))

        Then("it should respond with an error")
        attempt shouldBe a[ProcessingError]
      }

      "respond with an error if there's no such punter" in {
        When("received a notification")
        val withdrawalCreated = domain.PaymentStateChangedNotification(
          punterId = generatePunterId(),
          transactionId = generateTransactionId(),
          paymentId = generatePaymentId(),
          amount = PositiveAmount.ensure(DefaultCurrencyMoney(2137)).unsafe(),
          paymentMethod = CashWithdrawal,
          stateDefinition = WithdrawnToUser,
          creationType = User)

        val attempt = awaitLeft(objectUnderTest.handle(withdrawalCreated))

        Then("it should respond with an error")
        attempt shouldBe a[ProcessingError]
      }
    }

    "process CANCELLATION if withdrawal reservation exists" in {
      val allWalletFunds = 100

      Given("a punter with money in his wallet")
      val balance = DefaultCurrencyMoney(allWalletFunds)
      val punter =
        environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = balance)

      And("a withdrawal reservation for FULL amount")
      val identifier = CashWithdrawalIdentifier.create()

      awaitRight(
        environment.walletsBC.reserveForWithdrawal(
          WalletId.deriveFrom(punter.punterId),
          WithdrawalReservation(
            identifier.asReservation,
            PositiveAmount.ensure(RealMoney(allWalletFunds)).unsafe(),
            PaymentMethod.CashWithdrawalPaymentMethod)))

      When("a notification is received")
      val withdrawnToUser = domain.PaymentStateChangedNotification(
        punterId = punter.punterId,
        transactionId = identifier.asTransaction,
        paymentId = generatePaymentId(),
        amount = PositiveAmount.ensure(DefaultCurrencyMoney(allWalletFunds)).unsafe(),
        paymentMethod = CashWithdrawal,
        stateDefinition = Expired,
        creationType = User)

      Then("it should respond with success")
      noException should be thrownBy awaitRight(objectUnderTest.handle(withdrawnToUser))
    }
  }
}
