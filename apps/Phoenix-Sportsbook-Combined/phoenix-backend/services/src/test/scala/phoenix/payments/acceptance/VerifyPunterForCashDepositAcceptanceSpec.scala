package phoenix.payments.acceptance
import scala.concurrent.duration._

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.VerifyPunterForCashDeposit
import phoenix.payments.application.VerifyPunterForCashDeposit.MultipleUsersFound
import phoenix.payments.application.VerifyPunterForCashDeposit.PunterNotAllowedToDeposit
import phoenix.payments.application.VerifyPunterForCashDeposit.UserNotFound
import phoenix.payments.domain.CashDepositVerificationSuccessResponse
import phoenix.payments.domain.PaymentLimits
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.UsernameAndEmailCashDepositVerification
import phoenix.payments.domain.UsernameCashDepositVerification
import phoenix.punters.KeycloakDataConverter
import phoenix.punters.PunterDataGenerator.createDepositLimitAmount
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.Email
import phoenix.punters.domain.Limit
import phoenix.punters.domain.Limits
import phoenix.punters.domain.Punter
import phoenix.punters.domain.RegisteredUser
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.Username
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.TestScenarios.RandomPunter
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod

final class VerifyPunterForCashDepositAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with KeycloakIntegrationSpec
    with DatabaseIntegrationSpec
    with FutureSupport
    with GivenWhenThen {

  private val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)

  val useCaseUnderTest =
    new VerifyPunterForCashDeposit(
      environment.puntersBC,
      environment.walletsBC,
      environment.puntersRepository,
      ConstantUUIDGenerator)

  "VerifyPunterForCashDeposit" when {

    "a punter is active" should {

      "return success response with default max limit if no deposit limits are set" in {

        Given("an active Punter with money in their wallet")
        val punter = createRandomPunterAndRegisteredUser().punter

        When("the Punter tries to deposit at cage")
        val request =
          UsernameAndEmailCashDepositVerification(punter.details.userName, punter.details.email)
        val result = awaitRight(useCaseUnderTest.verify(request))

        Then("the Punter should receive success and have the default max limit")
        val expectedResult = CashDepositVerificationSuccessResponse(
          punter.punterId,
          TransactionId(ConstantUUIDGenerator.generate()),
          punter.details,
          PaymentLimits(min = MoneyAmount(1), max = MoneyAmount(1000000)),
          punter.ssn.toLast4Digits)
        result shouldBe expectedResult
      }

      "return success response with correct max limit if deposit limits are set" in {

        Given("an active Punter with money in their wallet")
        val punter = createRandomPunterAndRegisteredUser().punter

        And("the punter has set deposit limits")
        val limits = Limits.unsafe(
          Limit.Daily(Some(createDepositLimitAmount(21))),
          Limit.Weekly(Some(createDepositLimitAmount(37))),
          Limit.Monthly(Some(createDepositLimitAmount(2137))))
        environment.puntersBC.setDepositLimits(punter.punterId, limits)

        When("the Punter tries to deposit at cage")
        val request = UsernameCashDepositVerification(punter.details.userName)
        val result = awaitRight(useCaseUnderTest.verify(request))

        Then("the response should be successful and have the correct max limit")
        val expectedResult = CashDepositVerificationSuccessResponse(
          punter.punterId,
          TransactionId(ConstantUUIDGenerator.generate()),
          punter.details,
          PaymentLimits(min = MoneyAmount(1), max = MoneyAmount(21)),
          punter.ssn.toLast4Digits)
        result shouldBe expectedResult
      }

      "return success response with correct max limit if deposit limits are set and punter has already deposited" in {

        Given("an active Punter with money in their wallet")
        val punterData = createRandomPunterAndRegisteredUser()
        val randomPunter = punterData.randomPunter
        val punter = punterData.punter

        And("the punter has set deposit limits")
        val limits = Limits.unsafe(
          Limit.Daily(Some(createDepositLimitAmount(21))),
          Limit.Weekly(Some(createDepositLimitAmount(37))),
          Limit.Monthly(Some(createDepositLimitAmount(2137))))
        awaitRight(environment.puntersBC.setDepositLimits(randomPunter.punterId, limits))

        And("the punter has made a deposit")
        awaitRight(
          environment.walletsBC.deposit(
            randomPunter.walletId,
            PositiveAmount.ensure(RealMoney(19)).unsafe(),
            CreditFundsReason.Deposit,
            PaymentMethod.CreditCardPaymentMethod))

        When("the Punter tries to deposit at cage")
        val request = UsernameCashDepositVerification(punter.details.userName)
        val result = awaitRight(useCaseUnderTest.verify(request))

        Then("the response should be successful and have the correct max limit")
        val expectedResult = CashDepositVerificationSuccessResponse(
          randomPunter.punterId,
          TransactionId(ConstantUUIDGenerator.generate()),
          punter.details,
          PaymentLimits(min = MoneyAmount(1), max = MoneyAmount(2)),
          punter.ssn.toLast4Digits)
        result shouldBe expectedResult
      }

      "return success response if username is correct and email incorrect" in {

        Given("an active Punter with money in their wallet")
        val punter = createRandomPunterAndRegisteredUser().punter

        When("the Punter tries to deposit at cage")
        val request = UsernameAndEmailCashDepositVerification(
          punter.details.userName,
          Email.fromStringUnsafe("google@chucknorris.com"))
        val result = awaitRight(useCaseUnderTest.verify(request))

        Then("the Punter should receive success and have the default max limit")
        val expectedResult = CashDepositVerificationSuccessResponse(
          punter.punterId,
          TransactionId(ConstantUUIDGenerator.generate()),
          punter.details,
          PaymentLimits(min = MoneyAmount(1), max = MoneyAmount(1000000)),
          punter.ssn.toLast4Digits)
        result shouldBe expectedResult
      }

      "return success response if username is incorrect and email correct" in {

        Given("an active Punter with money in their wallet")
        val punter = createRandomPunterAndRegisteredUser().punter

        When("the Punter tries to deposit at cage")
        val request =
          UsernameAndEmailCashDepositVerification(Username.fromStringUnsafe("ChuckNorris1"), punter.details.email)
        val result = awaitRight(useCaseUnderTest.verify(request))

        Then("the Punter should receive success and have the default max limit")
        val expectedResult = CashDepositVerificationSuccessResponse(
          punter.punterId,
          TransactionId(ConstantUUIDGenerator.generate()),
          punter.details,
          PaymentLimits(min = MoneyAmount(1), max = MoneyAmount(1000000)),
          punter.ssn.toLast4Digits)
        result shouldBe expectedResult
      }

      "return MultipleUsersFound if username and email are correct but refer to different users" in {

        Given("an active Punter with money in their wallet")
        val registeredUser1 = createRandomPunterAndRegisteredUser().punter

        And("another active Punter with money in their wallet")
        val registeredUser2 = createRandomPunterAndRegisteredUser().punter

        When("the Punter tries to deposit at cage")
        val request =
          UsernameAndEmailCashDepositVerification(registeredUser1.details.userName, registeredUser2.details.email)
        val result = awaitLeft(useCaseUnderTest.verify(request))

        Then("result should be a failure that prevents depositing")
        result shouldBe MultipleUsersFound
      }
    }

    "A punter is self-excluded" should {

      "return PunterNotAllowedToDeposit" in {

        Given("a self-excluded Punter")
        val punter =
          environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
        awaitRight(
          environment.puntersBC
            .beginSelfExclusion(punter.punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

        val registeredUser =
          await(environment.authenticationRepository.findUser(UserLookupId.byPunterId(punter.punterId))).get

        When("the Punter tries to deposit at cage")
        val request = UsernameCashDepositVerification(registeredUser.details.userName)

        Then("result should be a failure that prevents depositing")
        val result = awaitLeft(useCaseUnderTest.verify(request))
        result shouldBe PunterNotAllowedToDeposit
      }
    }
  }

  "A punter is cooling-off" should {

    "return PunterNotAllowedToDeposit" in {

      Given("a Punter in cool-off")
      val punter =
        environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
      awaitRight(environment.puntersBC.beginCoolOff(punter.punterId, 3.days, CoolOffCause.SelfInitiated))

      val registeredUser =
        await(environment.authenticationRepository.findUser(UserLookupId.byPunterId(punter.punterId))).get

      When("the Punter tries to deposit at cage")
      val request = UsernameCashDepositVerification(registeredUser.details.userName)

      Then("result should be a failure that prevents depositing")
      val result = awaitLeft(useCaseUnderTest.verify(request))
      result shouldBe PunterNotAllowedToDeposit
    }
  }

  "A punter is suspended" should {

    "return PunterNotAllowedToDeposit" in {

      Given("a suspended Punter")
      val punter =
        environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance = DefaultCurrencyMoney(2137))
      awaitRight(
        environment.puntersBC.suspend(punter.punterId, OperatorSuspend("F"), suspendedAt = randomOffsetDateTime()))

      val registeredUser =
        await(environment.authenticationRepository.findUser(UserLookupId.byPunterId(punter.punterId))).get

      When("the Punter tries to deposit at cage")
      val request = UsernameCashDepositVerification(registeredUser.details.userName)

      Then("result should be a failure that prevents depositing")
      val result = awaitLeft(useCaseUnderTest.verify(request))
      result shouldBe PunterNotAllowedToDeposit
    }
  }

  "A punter doesn't exist" should {

    "return PunterNotAllowedToDeposit" in {

      When("the Punter tries to deposit at cage")
      val request = UsernameCashDepositVerification(Username.fromStringUnsafe("???"))

      Then("result should be a failure that prevents depositing")
      val result = awaitLeft(useCaseUnderTest.verify(request))
      result shouldBe UserNotFound
    }
  }

  case class PunterUserAndRandomPunter(punter: Punter, user: RegisteredUser, randomPunter: RandomPunter)

  private def createRandomPunterAndRegisteredUser(
      initialBalance: DefaultCurrencyMoney = DefaultCurrencyMoney(2137)): PunterUserAndRandomPunter = {
    val randomPunter =
      environment.punterScenarios.punterWithRegisteredUserAndWallet(initialBalance)
    val registeredUserKeycloak = await(
      environment.authenticationRepository.findUser(UserLookupId.byPunterId(randomPunter.punterId))).get
    val registeredPunter = await(environment.puntersRepository.findByPunterId(randomPunter.punterId)).get
    val registeredUser = KeycloakDataConverter.toRegisteredUser(registeredUserKeycloak, registeredPunter).toOption.get

    PunterUserAndRandomPunter(registeredPunter, registeredUser, randomPunter)
  }
}
