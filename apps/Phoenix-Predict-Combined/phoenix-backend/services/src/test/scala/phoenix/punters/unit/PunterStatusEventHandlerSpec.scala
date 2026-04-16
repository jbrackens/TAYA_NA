package phoenix.punters.unit

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generatePunterProfileSuspendedEvent
import phoenix.punters.PunterDataGenerator.Api.generatePunterUnsuspendStartedEvent
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events.CoolOffEnded
import phoenix.punters.PunterProtocol.Events.CoolOffExclusionBegan
import phoenix.punters.PunterState.CoolOffPeriod
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.application.LogoutUseCase
import phoenix.punters.application.es.PunterStatusEventHandler
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError

final class PunterStatusEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport {

  implicit val clock: Clock = new FakeHardcodedClock()
  implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  val puntersBC = new MemorizedTestPuntersContext()
  val testLogoutUseCase =
    new LogoutUseCase(new TestAuthenticationRepository(), new PuntersContextProviderSuccess()(clock))

  "A PunterStatusEventHandler" should {

    "request a balance check on a PunterUnsuspendStarted event" in new StatusEventHandler {
      val event = generatePunterUnsuspendStartedEvent()

      PunterStatusEventHandler
        .handle(
          ConstantUUIDGenerator,
          testLogoutUseCase,
          new PuntersContextProviderSuccess()(clock),
          new WalletContextProviderSuccess(clock) {
            override def requestBalanceCheckForUnsuspend(walletId: WalletId)(implicit
                ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = {
              punters = punters :+ walletId.owner
              EitherT.safeRightT(())
            }
          })(event)
        .futureValue

      punters should contain(event.punterId)
    }

    "end punter session on a PunterSuspended event" in new StatusEventHandler {
      val event = generatePunterProfileSuspendedEvent()

      PunterStatusEventHandler
        .handle(
          ConstantUUIDGenerator,
          new LogoutUseCase(
            new TestAuthenticationRepository() {
              override def signOut(punterId: PunterId): Future[Unit] = {
                Future.successful { punters = punters :+ punterId }
              }
            },
            new PuntersContextProviderSuccess()(clock)),
          puntersBC,
          new WalletContextProviderSuccess(clock))(event)
        .futureValue
      punters should contain(event.punterId)
    }

    "starting a new session when punter enters cool off and has a session open" in {
      // given
      val punterId = generatePunterId()
      val tokenTimeout = clock.currentOffsetDateTime().plusMonths(5)
      val event = CoolOffExclusionBegan(
        punterId,
        CoolOffPeriod(clock.currentOffsetDateTime(), clock.currentOffsetDateTime().plusSeconds(2)),
        CoolOffCause.SessionLimitBreach,
        Some(tokenTimeout))

      // when
      await(
        PunterStatusEventHandler
          .handle(ConstantUUIDGenerator, testLogoutUseCase, puntersBC, new WalletContextProviderSuccess(clock))(event))

      // then
      val (savedPunterId, sessionId, savedTokenTimeout) = puntersBC.startSessions.get().filter(_._1 == punterId).head
      savedPunterId should ===(punterId)
      sessionId should ===(SessionId.fromUUID(ConstantUUIDGenerator.generate()))
      savedTokenTimeout should ===(tokenTimeout)
    }

    "not start a new session when punter enters cool off and doesn't have a session open" in {
      // given
      val punterId = generatePunterId()
      val event = CoolOffExclusionBegan(
        punterId,
        CoolOffPeriod(clock.currentOffsetDateTime(), clock.currentOffsetDateTime().plusSeconds(2)),
        CoolOffCause.SessionLimitBreach,
        None)

      // when
      await(
        PunterStatusEventHandler
          .handle(ConstantUUIDGenerator, testLogoutUseCase, puntersBC, new WalletContextProviderSuccess(clock))(event))

      // then
      puntersBC.startSessions.get().filter(_._1 == punterId) should have size 0
    }

    "start a new session when punter exits cool-off and has a session open" in {
      // given
      val punterId = generatePunterId()
      val tokenTimeout = clock.currentOffsetDateTime().plusMonths(5)
      val event = CoolOffEnded(punterId, CoolOffCause.SessionLimitBreach, Some(tokenTimeout))

      // when
      await(
        PunterStatusEventHandler
          .handle(ConstantUUIDGenerator, testLogoutUseCase, puntersBC, new WalletContextProviderSuccess(clock))(event))

      // then
      val (savedPunterId, sessionId, savedTokenTimeout) = puntersBC.startSessions.get().filter(_._1 == punterId).head
      savedPunterId should ===(punterId)
      sessionId should ===(SessionId.fromUUID(ConstantUUIDGenerator.generate()))
      savedTokenTimeout should ===(tokenTimeout)
    }

    "not start a new session when punter exits cool-off and doesn't have a session open" in {
      // given
      val punterId = generatePunterId()
      val event = CoolOffEnded(punterId, CoolOffCause.SessionLimitBreach, None)

      // when
      await(
        PunterStatusEventHandler
          .handle(ConstantUUIDGenerator, testLogoutUseCase, puntersBC, new WalletContextProviderSuccess(clock))(event))

      // then
      puntersBC.startSessions.get().filter(_._1 == punterId) should have size 0
    }
  }
}

private trait StatusEventHandler {
  var punters = List.empty[PunterId]
}
