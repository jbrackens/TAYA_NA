package phoenix.backoffice.acceptance

import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.backoffice.ActorBackofficeBoundedContext
import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.bets.support.BetDataGenerator
import phoenix.support._
import phoenix.wallets.WalletActorProtocol.events.WalletEvent

final class MarketExposureAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with Eventually {

  "Backoffice Bounded Context" should {
    "create BackofficeMarket when a BetOpened happens" in {
      // given
      val event = BetDataGenerator.generateBetOpenedEvent()

      val betProjectionRunner = TestEventQueue.instance[BetEvent]
      val walletProjectionRunner = TestEventQueue.instance[WalletEvent]

      val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
      val repository = ActorBackofficeBoundedContext.apply(
        system,
        dbConfig,
        betProjectionRunner,
        walletProjectionRunner,
        env.puntersBC,
        env.walletsBC,
        env.noteRepository,
        env.uuidGenerator,
        env.clock)

      // when
      betProjectionRunner.pushEvent(event)

      // then
      eventually {
        repository.findExposure(event.betData.marketId, event.betData.selectionId).futureValue should matchPattern {
          case Some(_) =>
        }
      }
    }
  }
}
