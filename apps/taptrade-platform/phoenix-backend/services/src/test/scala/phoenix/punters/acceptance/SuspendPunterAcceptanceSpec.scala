package phoenix.punters.acceptance

import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.concurrent.IntegrationPatience
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.BetEntity.BetId
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.odds.Odds
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.PunterStatus.Active
import phoenix.punters.domain.PunterStatus.Suspended
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.support._
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.BetPlacementOutcome
import phoenix.wallets.domain.Funds
import phoenix.wallets.domain.Funds.RealMoney

final class SuspendPunterAcceptanceSpec
    extends AnyWordSpec
    with GivenWhenThen
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with ProvidedExecutionContext
    with IntegrationPatience
    with Eventually {

  val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  def dateInTheFuture = Clock.utcClock.currentOffsetDateTime().plusMinutes(10)

  "A Punters Bounded Context" should {

    "suspend a punter with a negative balance after bet resettlement" in {

      Given("an active punter with positive balance and an active session")
      val (punter, _) = env.punterScenarios.punterAccount(DefaultCurrencyMoney(BigDecimal(10)))
      awaitRight(
        env.puntersBC.startSession(
          punter.punterId,
          SessionId(RandomUUIDGenerator.generate().toString),
          dateInTheFuture,
          ipAddress = None))
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Active

      When("a bet resettlement is triggered for an amount higher than the current balance")
      val betId = BetId(RandomUUIDGenerator.generate().toString)
      awaitRight(
        env.walletsBC.refinalizeBet(
          punter.walletId,
          Bet(betId, Funds.RealMoney(DefaultCurrencyMoney(20)), Odds(1.1)),
          BetPlacementOutcome.Lost))

      Then("the punter balance is negative")
      awaitRight(env.walletsBC.currentBalance(punter.walletId)) shouldBe Balance(RealMoney(-12.00))

      And("the punter is suspended")
      eventually {
        val punterProfile = awaitRight(env.puntersBC.getPunterProfile(punter.punterId))
        punterProfile.status shouldBe Suspended(NegativeBalance("Negative balance after resettlement"))
      }
    }
  }
}
