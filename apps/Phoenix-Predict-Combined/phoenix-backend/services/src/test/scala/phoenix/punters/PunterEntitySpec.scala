package phoenix.punters
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.persistence.testkit.scaladsl.EventSourcedBehaviorTestKit
import com.typesafe.config
import org.scalatest.BeforeAndAfterEach
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Commands._
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.Events.PunterUnsuspended
import phoenix.punters.PunterProtocol.Events.PunterVerified
import phoenix.punters.PunterProtocol.Responses.Failure.SessionNotFound
import phoenix.punters.PunterProtocol.Responses.Success.SessionEndedResponse
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.ActivePunter
import phoenix.punters.PunterState.EndedSession
import phoenix.punters.PunterState.PunterState
import phoenix.punters.PunterState.SelfExcludedPunter
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.Limits
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.time.FakeHardcodedClock
import phoenix.utils.RandomUUIDGenerator

class PunterEntitySpec
    extends ScalaTestWithActorTestKit(
      EventSourcedBehaviorTestKit.config.withFallback(
        config.ConfigFactory.parseString(PhoenixCirceAkkaSerializerSpec.config)))
    with AnyWordSpecLike
    with BeforeAndAfterEach {

  private val clock: Clock = new FakeHardcodedClock()
  private val punterId: PunterId = PunterId("1")
  private val adminId: AdminId = AdminId("2")
  private val eventSourcedTestKit =
    EventSourcedBehaviorTestKit[PunterCommand, PunterEvent, PunterState](system, PunterEntity(punterId, clock))

  def dateInTheFuture = clock.currentOffsetDateTime().plusMinutes(15)

  override def beforeEach(): Unit = {
    super.beforeEach()
    eventSourcedTestKit.clear()
  }

  "PunterEntity" should {
    "handle EndSession for SuspendedPunter when there is no current session" in {
      initializePunterWithoutLimits()
      eventSourcedTestKit.runCommand(Suspend(punterId, RegistrationIssue("test"), clock.currentOffsetDateTime(), _))

      val result = eventSourcedTestKit.runCommand(EndSession(punterId, _))
      result.reply should ===(SessionNotFound(punterId))
      result.hasNoEvents should ===(true)
    }

    "handle EndSession for SuspendedPunter with a current session" in {
      initializePunterWithoutLimits()
      val sessionId = SessionId(RandomUUIDGenerator.generate().toString)
      eventSourcedTestKit.runCommand(StartSession(punterId, sessionId, dateInTheFuture, ipAddress = None, _))
      eventSourcedTestKit.runCommand(Suspend(punterId, RegistrationIssue("test"), clock.currentOffsetDateTime(), _))

      val result = eventSourcedTestKit.runCommand(EndSession(punterId, _))
      result.reply match {
        case SessionEndedResponse(sessionPunterId, EndedSession(endedSessionId, _, _, Unlimited(_))) =>
          sessionPunterId == punterId && endedSessionId == sessionId shouldBe true
        case response => fail(s"Unexpected response from EndSession command: $response")
      }
    }

    "not activate suspended punter if it was already activated" in {
      initializePunterWithoutLimits()

      eventSourcedTestKit.runCommand(VerifyPunter(punterId, ActivationPath.IDPV, _))
      eventSourcedTestKit.runCommand(Suspend(punterId, RegistrationIssue("test"), clock.currentOffsetDateTime(), _))
      eventSourcedTestKit.runCommand(Unsuspend(punterId, adminId, _))
      val result = eventSourcedTestKit.runCommand(CompleteUnsuspend(punterId, _))
      result.events should ===(Seq(PunterUnsuspended(punterId)))
      result.state.asInstanceOf[ActivePunter].data.activationPath should ===(Some(ActivationPath.IDPV))
    }

    "activate suspended punter if it was not already activated" in {
      initializePunterWithoutLimits()

      eventSourcedTestKit.runCommand(Suspend(punterId, RegistrationIssue("test"), clock.currentOffsetDateTime(), _))
      eventSourcedTestKit.runCommand(Unsuspend(punterId, adminId, _))
      val result = eventSourcedTestKit.runCommand(CompleteUnsuspend(punterId, _))
      result.events should ===(
        Seq(
          PunterVerified(punterId, ActivationPath.Manual, clock.currentOffsetDateTime(), verifiedBy = Some(adminId)),
          PunterUnsuspended(punterId)))
      result.state.asInstanceOf[ActivePunter].data.activationPath should ===(Some(ActivationPath.Manual))
    }

    "activate suspended and self excluded punter if it was not already activated" in {
      initializePunterWithoutLimits()

      eventSourcedTestKit.runCommand(Suspend(punterId, RegistrationIssue("test"), clock.currentOffsetDateTime(), _))
      eventSourcedTestKit.runCommand(BeginSelfExclusion(punterId, SelfExclusionOrigin.External, _))
      eventSourcedTestKit.runCommand(Unsuspend(punterId, adminId, _))
      val result = eventSourcedTestKit.runCommand(CompleteUnsuspend(punterId, _))
      result.events should ===(
        Seq(
          PunterVerified(punterId, ActivationPath.Manual, clock.currentOffsetDateTime(), verifiedBy = Some(adminId)),
          PunterUnsuspended(punterId)))
      result.state.asInstanceOf[SelfExcludedPunter].data.activationPath should ===(Some(ActivationPath.Manual))
    }
  }

  private def initializePunterWithoutLimits() = {
    eventSourcedTestKit.runCommand(CreatePunterProfile(punterId, Limits.none, Limits.none, Limits.none, None, true, _))
  }
}
