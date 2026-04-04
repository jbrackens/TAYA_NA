package phoenix.punters.acceptance

import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.scalatest.BeforeAndAfterEach
import org.scalatest.EitherValues
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.concurrent.IntegrationPatience
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.domain.PunterStatus.Active
import phoenix.punters.domain.PunterStatus.SelfExcluded
import phoenix.punters.domain.PunterStatus.Suspended
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.support._
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendApproved
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendRejected
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

final class UnsuspendPunterAcceptanceSpec
    extends AnyWordSpec
    with GivenWhenThen
    with Matchers
    with FutureSupport
    with EitherValues
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with ProvidedExecutionContext
    with IntegrationPatience
    with BeforeAndAfterEach
    with Eventually {

  val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  val suspension = OperatorSuspend("he's not the messiah")
  var unsuspendEvents = List.empty[WalletEvent]
  env.walletProjectionRunner.runProjection(
    PhoenixProjectionConfig("test-projection"),
    (envelope: EventEnvelope[WalletEvent]) => {
      envelope.event match {
        case event @ (PunterUnsuspendRejected(_) | PunterUnsuspendApproved(_)) =>
          unsuspendEvents = unsuspendEvents :+ event
          Future.successful(Done)
        case _ => Future.successful(Done)
      }
    })

  private def assertUnsuspendEventTriggered(event: WalletEvent) = {
    eventually {
      unsuspendEvents should contain(event)
    }
  }

  override protected def beforeEach(): Unit = {
    super.beforeEach()
    unsuspendEvents = List.empty[WalletEvent]
  }

  "A Punters Bounded Context" should {

    "unsuspend a punter with positive wallet balance" in {

      Given("a suspended punter with positive balance")
      val (punter, _) = env.punterScenarios.punterAccount(DefaultCurrencyMoney(BigDecimal(8.63)))
      awaitRight(env.puntersBC.suspend(punter.punterId, suspension, env.clock.currentOffsetDateTime()))
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Suspended(suspension)

      When("a punter unsuspend operation is triggered")
      awaitRight(env.puntersBC.unsuspend(punter.punterId, AdminId("test")))

      Then("the punter status is updated to Active")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Active
      }
    }

    "unsuspend a punter with zero wallet balance" in {

      Given("a suspended punter with zero balance")
      val (punter, _) = env.punterScenarios.punterAccount(DefaultCurrencyMoney(BigDecimal(0)))
      awaitRight(env.puntersBC.suspend(punter.punterId, suspension, env.clock.currentOffsetDateTime()))
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Suspended(suspension)

      When("a punter unsuspend operation is triggered")
      awaitRight(env.puntersBC.unsuspend(punter.punterId, AdminId("test")))

      Then("the punter status is updated to Active")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Active
      }
    }

    "not unsuspend a punter with a negative balance" in {

      Given("a suspended punter with negative balance")
      val (punter, _) = env.punterScenarios.punterAccount(DefaultCurrencyMoney(BigDecimal(-10)))
      awaitRight(env.puntersBC.suspend(punter.punterId, suspension, env.clock.currentOffsetDateTime()))
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Suspended(suspension)

      When("a punter unsuspend operation is triggered")
      awaitRight(env.puntersBC.unsuspend(punter.punterId, AdminId("test")))

      Then("the unsuspend operation is rejected")
      assertUnsuspendEventTriggered(PunterUnsuspendRejected(WalletId.deriveFrom(punter.punterId)))

      And("the punter remains Suspended")
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Suspended(suspension)
    }

    "unsuspend a self-excluded punter with positive wallet balance" in {

      Given("a suspended/self-excluded punter with positive balance")
      val (punter, _) = env.punterScenarios.punterAccount(DefaultCurrencyMoney(BigDecimal(8.63)))
      awaitRight(env.puntersBC.suspend(punter.punterId, suspension, env.clock.currentOffsetDateTime()))
      awaitRight(env.puntersBC.beginSelfExclusion(punter.punterId, SelfExclusionOrigin.External))
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe SelfExcluded

      When("a punter unsuspend operation is triggered")
      awaitRight(env.puntersBC.unsuspend(punter.punterId, AdminId("test")))

      Then("the unsuspend operation is approved")
      assertUnsuspendEventTriggered(PunterUnsuspendApproved(WalletId.deriveFrom(punter.punterId)))

      And("the punter status remains self-excluded")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe SelfExcluded
      }

      When("a punter end self-exclusion operation is triggered")
      awaitRight(env.puntersBC.endSelfExclusion(punter.punterId))

      Then("the punter status is updated to Active")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Active
      }
    }

    "unsuspend a self-excluded punter with zero wallet balance" in {

      Given("a suspended/self-excluded punter with positive balance")
      val (punter, _) = env.punterScenarios.punterAccount(DefaultCurrencyMoney(BigDecimal(0)))
      awaitRight(env.puntersBC.suspend(punter.punterId, suspension, env.clock.currentOffsetDateTime()))
      awaitRight(env.puntersBC.beginSelfExclusion(punter.punterId, SelfExclusionOrigin.External))
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe SelfExcluded

      When("a punter unsuspend operation is triggered")
      awaitRight(env.puntersBC.unsuspend(punter.punterId, AdminId("test")))

      Then("the unsuspend operation is approved")
      assertUnsuspendEventTriggered(PunterUnsuspendApproved(WalletId.deriveFrom(punter.punterId)))

      Then("the punter status remains self-excluded")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe SelfExcluded
      }

      When("a punter end self-exclusion operation is triggered")
      awaitRight(env.puntersBC.endSelfExclusion(punter.punterId))

      Then("the punter status is updated to Active")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Active
      }
    }

    "not unsuspend a self-excluded punter with a negative balance" in {

      Given("a suspended/self-excluded punter with negative balance")
      val (punter, _) = env.punterScenarios.punterAccount(DefaultCurrencyMoney(BigDecimal(-8.63)))
      awaitRight(env.puntersBC.suspend(punter.punterId, suspension, env.clock.currentOffsetDateTime()))
      awaitRight(env.puntersBC.beginSelfExclusion(punter.punterId, SelfExclusionOrigin.External))
      awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe SelfExcluded

      When("a punter unsuspend operation is triggered")
      awaitRight(env.puntersBC.unsuspend(punter.punterId, AdminId("test")))

      Then("the unsuspend operation is rejected")
      assertUnsuspendEventTriggered(PunterUnsuspendRejected(WalletId.deriveFrom(punter.punterId)))

      And("the punter status remains self-excluded")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe SelfExcluded
      }

      When("a punter end self-exclusion operation is triggered")
      awaitRight(env.puntersBC.endSelfExclusion(punter.punterId))

      Then("the punter status is updated to Suspended")
      eventually {
        awaitRight(env.puntersBC.getPunterProfile(punter.punterId)).status shouldBe Suspended(suspension)
      }
    }
  }
}
