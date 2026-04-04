package phoenix.payments.acceptance

import scala.concurrent.duration._

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.NotificationHandlingError.BlockedByMerchant
import phoenix.payments.application.NotificationHandlingError.UnknownState
import phoenix.payments.domain
import phoenix.payments.domain.CreationType.MerchantOperator
import phoenix.payments.domain.PaymentMethod.CashDeposit
import phoenix.payments.domain.StateDefinition.Created
import phoenix.payments.domain.StateDefinition.DepositedByUser
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentId
import phoenix.payments.support.PaymentsDataGenerator.generateTransactionId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
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
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.domain.Funds.RealMoney

final class HandlingCashDepositNotificationsAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with FutureSupport
    with GivenWhenThen {

  private val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  private val objectUnderTest = environment.paymentsModule.commands.handlePXPNotification
  private val ValidMinDeposit = BigDecimal(10)

  "HandlePXPNotification" when {
    "handling cash deposited by user" when {
      "processing 'Created' notification" should {
        "process it if punter exists, is active and has no deposit limits" in {
          Given("a punter with no deposit limit")
          val initialBalance = DefaultCurrencyMoney(0)
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance)

          When("a notification is received")
          val created = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          awaitRight(objectUnderTest.handle(created))

          Then("the punter's balance should not have changed")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(initialBalance))
        }

        "process it if punter exists, is active and amount doesn't breach deposit limits" in {
          Given("an active punter")
          val initialBalance = DefaultCurrencyMoney(0)
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = initialBalance)

          When("deposit limits are set")
          awaitRight(
            environment.puntersBC.setDepositLimits(
              punter.punterId,
              Limits.unsafe(
                Limit.Daily(Some(createDepositLimitAmount(ValidMinDeposit))),
                Limit.Weekly(Some(createDepositLimitAmount(ValidMinDeposit + 10))),
                Limit.Monthly(Some(createDepositLimitAmount(ValidMinDeposit + 30))))))

          And("a payment notification is received with amount equal to deposit limits")
          val created = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(ValidMinDeposit)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          awaitRight(objectUnderTest.handle(created))

          Then("the punter's balance should not have changed")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(initialBalance))
        }

        "respond with an error if punter exists, is active and amount is less than 10.00" in {
          Given("an active punter")
          val initialBalance = DefaultCurrencyMoney(0)
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = initialBalance)

          And("a payment notification is received with amount less than min valid limit")
          val created = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(ValidMinDeposit - 0.01)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          val attempt = awaitLeft(objectUnderTest.handle(created))

          Then("it should respond with an error")
          attempt shouldBe a[BlockedByMerchant]

          And("the punter's balance should not have changed")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(initialBalance))
        }

        "respond with an error if punter exists, is active and amount breaches deposit limits" in {
          Given("an active punter")
          val initialBalance = DefaultCurrencyMoney(0)
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = initialBalance)

          When("deposit limits are set")
          awaitRight(
            environment.puntersBC.setDepositLimits(
              punter.punterId,
              Limits.unsafe(
                Limit.Daily(Some(createDepositLimitAmount(ValidMinDeposit))),
                Limit.Weekly(Some(createDepositLimitAmount(ValidMinDeposit + 10))),
                Limit.Monthly(Some(createDepositLimitAmount(ValidMinDeposit + 30))))))

          And("a payment notification is received with amount greater than deposit limits")
          val created = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(ValidMinDeposit + 0.01)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          val attempt = awaitLeft(objectUnderTest.handle(created))

          Then("it should respond with an error")
          attempt shouldBe a[BlockedByMerchant]

          And("the punter's balance should not have changed")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(initialBalance))
        }

        "respond with an error in case punter is suspended" in {
          Given("a punter with money in his wallet")
          val initialBalance = DefaultCurrencyMoney(2137)
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = initialBalance)

          When("the punter is suspended")
          awaitRight(
            environment.puntersBC
              .suspend(punter.punterId, OperatorSuspend("because reasons"), suspendedAt = randomOffsetDateTime()))

          And("a payment notification is received")
          val created = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          val attempt = awaitLeft(objectUnderTest.handle(created))

          Then("it should respond with an error")
          attempt shouldBe a[BlockedByMerchant]

          And("the punter's balance should not have changed")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(initialBalance))
        }

        "respond with an error in case punter is self-excluded" in {
          Given("a punter with money in his wallet")
          val initialBalance = DefaultCurrencyMoney(2137)
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = initialBalance)

          When("the punter is self-excluded")
          awaitRight(
            environment.puntersBC
              .beginSelfExclusion(punter.punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

          And("a payment notification is received")
          val created = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          val attempt = awaitLeft(objectUnderTest.handle(created))

          Then("it should respond with an error")
          attempt shouldBe a[BlockedByMerchant]

          And("the punter's balance should not have changed")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(initialBalance))
        }

        "respond with an error in case punter is cooling-off" in {
          Given("a punter with money in his wallet")
          val initialBalance = DefaultCurrencyMoney(2137)
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = initialBalance)

          When("the punter is self-excluded")
          awaitRight(environment.puntersBC.beginCoolOff(punter.punterId, 1000.hours, CoolOffCause.SelfInitiated))

          And("a payment notification is received")
          val created = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          val attempt = awaitLeft(objectUnderTest.handle(created))

          Then("it should respond with an error")
          attempt shouldBe a[BlockedByMerchant]

          And("the punter's balance should not have changed")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(initialBalance))
        }

        "respond with an error if there's no such punter" in {
          When("received a notification")
          val created = domain.PaymentStateChangedNotification(
            punterId = generatePunterId(),
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(2137)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = Created,
            creationType = MerchantOperator)

          val attempt = awaitLeft(objectUnderTest.handle(created))

          Then("it should respond with an error")
          attempt shouldBe a[UnknownState]
        }
      }

      "processing 'DepositedByUser' notification" should {
        "process notification successfully" in {
          Given("a punter with no deposit limit")
          val punter =
            environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(0))

          When("a notification is received")
          val depositedByUser = domain.PaymentStateChangedNotification(
            punterId = punter.punterId,
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = DepositedByUser,
            creationType = MerchantOperator)

          awaitRight(objectUnderTest.handle(depositedByUser))

          Then("balance should be updated")
          val currentBalance = awaitRight(environment.walletsBC.currentBalance(punter.walletId))

          currentBalance shouldBe Balance(RealMoney(21.37))
        }

        "respond with an error if there's no such punter" in {
          When("received a notification")
          val depositedByUser = domain.PaymentStateChangedNotification(
            punterId = generatePunterId(),
            transactionId = generateTransactionId(),
            paymentId = generatePaymentId(),
            amount = PositiveAmount.ensure(DefaultCurrencyMoney(2137)).unsafe(),
            paymentMethod = CashDeposit,
            stateDefinition = DepositedByUser,
            creationType = MerchantOperator)

          val attempt = awaitLeft(objectUnderTest.handle(depositedByUser))

          Then("it should respond with an error")
          attempt shouldBe a[UnknownState]
        }
      }
    }
  }
}
