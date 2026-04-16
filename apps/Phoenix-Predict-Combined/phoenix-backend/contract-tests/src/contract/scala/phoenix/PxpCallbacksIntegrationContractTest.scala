package phoenix

import java.util.UUID

import org.scalatest.Assertion
import org.scalatest.concurrent.Eventually
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Second
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.Constants.Currency._

final class PxpCallbacksIntegrationContractTest
    extends UniqueTestUsers
    with AnyWordSpecLike
    with Matchers
    with PxpClient
    with WalletRequests
    with Eventually {

  private lazy val enablePxpTests = Config.instance.pxp.enablePxpTests

  val eventuallyTimeout: Timeout = Timeout(Span(120, Seconds))
  val eventuallyInterval: Interval = Interval(Span(1, Second))

  "punter" should {
    "be able to deposit funds" in withUniqueTestUser { testUser =>
      assume(enablePxpTests, "PXP should not be tested locally")
      // given
      val (accessToken, punterId, initialBalance) = signIn(testUser)

      // when
      await(initiateDeposit(punterId, testUser, txId = randomTransactionId(), amount = 21.37, currency = USD))

      // then
      expectPunterBalance(accessToken, initialBalance.realMoney + 21.37)
    }

    "be able to withdraw funds" in withUniqueTestUser { testUser =>
      assume(enablePxpTests, "PXP should not be tested locally")
      // given
      val (accessToken, punterId, initialBalance) = signIn(testUser)

      // and
      await(initiateDeposit(punterId, testUser, txId = randomTransactionId(), amount = 21.37, currency = USD))
      val postDepositBalance = initialBalance.realMoney + 21.37
      expectPunterBalance(accessToken, postDepositBalance)

      // when
      await(initiateWithdrawal(punterId, testUser, txId = randomTransactionId(), amount = 10, currency = USD))

      // then
      expectPunterBalance(accessToken, postDepositBalance - 10.00)
    }
  }

  private def expectPunterBalance(punterAccessToken: AuthToken, balance: RealMoney): Assertion =
    eventually(eventuallyTimeout, eventuallyInterval) {
      val currentBalance = await(checkBalance(punterAccessToken))
      currentBalance.realMoney shouldBe balance
    }

  private def signIn(user: User): (AuthToken, String, Balance) = {
    await(for {
      tokenResponse <- signIn(user.credentials)
      accessToken = tokenResponse.token
      punterId = tokenResponse.token.userId
      balance <- checkBalance(accessToken)
    } yield (accessToken, punterId, balance))
  }

  private def randomTransactionId(): String =
    UUID.randomUUID().toString
}
