package phoenix.punters

import java.time.OffsetDateTime
import java.util.UUID

import akka.actor.typed.ActorRef
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.persistence.typed.scaladsl.Effect
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import akka.persistence.typed.scaladsl.ReplyEffect
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Commands.BusinessCommand
import phoenix.punters.PunterProtocol.Commands.InfrastructureCommand
import phoenix.punters.PunterProtocol.Commands.StopPunter
import phoenix.punters.PunterProtocol.Commands._
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.PunterProtocol.Responses.Failure.SessionNotFound
import phoenix.punters.PunterProtocol.Responses.Success.DepositLimitsSet
import phoenix.punters.PunterProtocol.Responses.Success.IncrementFailedMFAAttemptCounterResponse
import phoenix.punters.PunterProtocol.Responses.Success.IncrementLoginFailureCounterResponse
import phoenix.punters.PunterProtocol.Responses.Success.LoginContextGotResetResponse
import phoenix.punters.PunterProtocol.Responses.Success.PunterStateGotResetResponse
import phoenix.punters.PunterProtocol.Responses.Success.SessionEndedResponse
import phoenix.punters.PunterProtocol.Responses.Success.SessionKeepaliveResponse
import phoenix.punters.PunterProtocol.Responses.Success.SessionLimitsSet
import phoenix.punters.PunterProtocol.Responses.Success.SessionStartedResponse
import phoenix.punters.PunterProtocol.Responses.Success.StakeLimitsSet
import phoenix.punters.PunterProtocol.Responses._
import phoenix.punters.PunterState._
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.Limits
import phoenix.punters.domain.LimitsLog
import phoenix.punters.domain.PunterSessions
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.SessionLimitation
import phoenix.punters.domain.StakeLimitAmount
import phoenix.sharding.PhoenixAkkaId
import phoenix.sharding.PhoenixId
import phoenix.sharding.PhoenixPersistenceId
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.utils.EventSourcedBehaviourConfiguration.enrichWithCommonPersistenceConfiguration

object PunterEntity {
  private val log = LoggerFactory.getLogger(this.objectName)

  final case class PunterId(value: String) extends PhoenixAkkaId

  object PunterId {
    def fromUuid(uuid: UUID): PunterId = PunterId(uuid.toString)
  }

  final case class AdminId(value: String) extends PhoenixId {

    def toPunterId: PunterId = PunterId(value)
  }

  object AdminId {
    def fromPunterId(punterId: PunterId): AdminId = AdminId(punterId.value)
    def fromUuid(uuid: UUID): AdminId = AdminId(uuid.toString)
  }

  def apply(punterId: PunterId, clock: Clock): Behavior[PunterCommand] = {
    Behaviors.setup[PunterCommand] { _ =>
      log.info("Context: PunterEntity - Starting Punter entity {}", kv("PunterId", punterId.value))
      enrichWithCommonPersistenceConfiguration {
        EventSourcedBehavior[PunterCommand, PunterEvent, PunterState](
          persistenceId = PhoenixPersistenceId.of(PunterShardingRegion.TypeKey, punterId),
          emptyState = NotExistingPunter,
          commandHandler = commandHandler(punterId, clock),
          eventHandler = PunterEventHandler()).withTagger(_ =>
          Set(ProjectionTag.from(punterId, PunterTags.punterTags).value))
      }
    }
  }

  def commandHandler(
      punterId: PunterId,
      clock: Clock): (PunterState, PunterCommand) => ReplyEffect[PunterEvent, PunterState] =
    (state, command) =>
      command match {
        case businessCommand: BusinessCommand =>
          BusinessCommandHandler(punterId, clock).apply(state, businessCommand)
        case infrastructureCommand: InfrastructureCommand =>
          InfrastructureCommandHandler(punterId).apply(state, infrastructureCommand)
      }
}

private object InfrastructureCommandHandler {
  private val log = LoggerFactory.getLogger(this.objectName)

  type CommandHandler = (PunterState, InfrastructureCommand) => ReplyEffect[PunterEvent, PunterState]

  def apply(punterId: PunterId): CommandHandler = {
    case (_, StopPunter) => stopPunter(punterId)
  }

  private def stopPunter(punterId: PunterId): ReplyEffect[PunterEvent, PunterState] = {
    log.info(s"Punter stopping: $punterId")
    Effect.stop().thenNoReply()
  }
}

private object BusinessCommandHandler {
  private val log = LoggerFactory.getLogger(this.objectName)

  type CommandHandler = (PunterState, BusinessCommand) => ReplyEffect[PunterEvent, PunterState]

  def apply(punterId: PunterId, clock: Clock): CommandHandler =
    (state, command) => checkEntityId(punterId, command)(() => handleCommand(punterId, clock).apply(state, command))

  private def checkEntityId(punterId: PunterId, command: BusinessCommand)(
      commandHandler: () => ReplyEffect[PunterEvent, PunterState]): ReplyEffect[PunterEvent, PunterState] =
    if (punterId == command.punterId) {
      commandHandler()
    } else {
      log.error(s"Command meant for [${command.punterId}] doesn't match receiving actor persistence id: $punterId")
      Effect.noReply
    }

  private def handleCommand(punterId: PunterId, clock: Clock): CommandHandler = {
    case (NotExistingPunter, command: CreatePunterProfile) => createPunterProfile(command)
    case (NotExistingPunter, command)                      => punterDoesNotExist(punterId, command)

    case (_: UnverifiedPunter, command: CreatePunterProfile)  => punterAlreadyExists(command)
    case (state: UnverifiedPunter, command: GetPunterProfile) => getPunterProfile(state, command)
    case (_: UnverifiedPunter, command: Suspend)              => suspend(command, command.suspendedAt)
    case (_: UnverifiedPunter, command: VerifyPunter)         => verifyPunter(command, clock)
    case (state: UnverifiedPunter, command: StartSession)     => startSession(command, state, clock)
    case (state: UnverifiedPunter, command: KeepaliveSession) => keepaliveSession(command, state)
    case (state: UnverifiedPunter, command: EndSession)       => endSession(command, state, clock)

    case (_: ActivePunter, command: CreatePunterProfile)  => punterAlreadyExists(command)
    case (state: ActivePunter, command: GetPunterProfile) => getPunterProfile(state, command)
    case (state: ActivePunter, command: StartSession)     => startSession(command, state, clock)
    case (state: ActivePunter, command: KeepaliveSession) => keepaliveSession(command, state)
    case (state: ActivePunter, command: EndSession)       => endSession(command, state, clock)
    case (state: ActivePunter, command: BeginCoolOff)     => beginCoolOff(command, state, clock)
    case (_: ActivePunter, command: EndCoolOff)           => punterNotCoolingOff(command)
    case (state: ActivePunter, command: SetDepositLimits) => setDepositLimits(state, command, clock)
    case (state: ActivePunter, command: SetSessionLimits) => setSessionLimits(command, state, clock)
    case (state: ActivePunter, command: SetStakeLimits)   => setStakeLimits(state, command, clock)
    case (_: ActivePunter, command: Suspend)              => suspend(command, command.suspendedAt)
    case (_: ActivePunter, command: Unsuspend)            => notSuspended(command)
    case (_: ActivePunter, command: CompleteUnsuspend)    => notSuspended(command)
    case (_: ActivePunter, command: SetNegativeBalance)   => setNegativeBalance(command)
    case (_: ActivePunter, command: UnverifyPunter)       => unverifyPunter(command)

    case (state: CoolOffPunter, command: GetPunterProfile) => getPunterProfile(state, command)
    case (_: CoolOffPunter, command: BeginCoolOff)         => punterIsCoolingOff(command)
    case (state: CoolOffPunter, command: EndCoolOff)       => endCoolOff(state, state.coolOffInfo.cause, command)
    case (_: CoolOffPunter, command: SetDepositLimits)     => punterIsCoolingOff(command)
    case (_: CoolOffPunter, command: SetSessionLimits)     => punterIsCoolingOff(command)
    case (_: CoolOffPunter, command: SetStakeLimits)       => punterIsCoolingOff(command)
    case (_: CoolOffPunter, command: Suspend)              => suspend(command, command.suspendedAt)
    case (_: CoolOffPunter, command: Unsuspend)            => notSuspended(command)
    case (_: CoolOffPunter, command: CompleteUnsuspend)    => notSuspended(command)
    case (state: CoolOffPunter, command: StartSession)     => startUnlimitedSession(command, state, clock)
    case (state: CoolOffPunter, command: KeepaliveSession) => keepaliveSession(command, state)
    case (state: CoolOffPunter, command: EndSession)       => endSession(command, state, clock)
    case (_: CoolOffPunter, command: SetNegativeBalance)   => setNegativeBalance(command)
    case (_: CoolOffPunter, command: UnverifyPunter)       => unverifyPunter(command)

    case (state: SelfExcludedPunter, command: GetPunterProfile)  => getPunterProfile(state, command)
    case (_: SelfExcludedPunter, command: BeginCoolOff)          => punterIsSelfExcluded(punterId, command)
    case (state: SelfExcludedPunter, command: EndCoolOff)        => endCoolOffSelfExcludedPunter(punterId, state, command)
    case (_: SelfExcludedPunter, command: BeginSelfExclusion)    => punterIsSelfExcluded(punterId, command)
    case (_: SelfExcludedPunter, command: EndSelfExclusion)      => endSelfExclusion(command)
    case (_: SelfExcludedPunter, command: SetDepositLimits)      => punterIsSelfExcluded(punterId, command)
    case (_: SelfExcludedPunter, command: SetSessionLimits)      => punterIsSelfExcluded(punterId, command)
    case (_: SelfExcludedPunter, command: SetStakeLimits)        => punterIsSelfExcluded(punterId, command)
    case (_: SelfExcludedPunter, command: Suspend)               => punterIsSelfExcluded(punterId, command)
    case (_: SelfExcludedPunter, command: Unsuspend)             => unsuspend(command)
    case (state: SelfExcludedPunter, command: CompleteUnsuspend) => unsuspendSelfExcludedPunter(state, command, clock)
    case (state: SelfExcludedPunter, command: StartSession)      => startUnlimitedSession(command, state, clock)
    case (state: SelfExcludedPunter, command: KeepaliveSession)  => keepaliveSession(command, state)
    case (state: SelfExcludedPunter, command: EndSession)        => endSession(command, state, clock)
    case (_: SelfExcludedPunter, command: SetNegativeBalance)    => setNegativeBalance(command)
    case (_: SelfExcludedPunter, command: UnverifyPunter)        => unverifyPunter(command)

    case (state: SuspendedPunter, command: GetPunterProfile) => getPunterProfile(state, command)
    case (_: SuspendedPunter, command: Suspend)              => alreadySuspended(punterId, command)
    case (_: SuspendedPunter, command: BeginCoolOff)         => suspended(punterId, command)
    case (state: SuspendedPunter, command: EndCoolOff)       => endCoolOffSuspendedPunter(punterId, state, command)
    case (_: SuspendedPunter, command: EndSelfExclusion)     => suspended(punterId, command)
    case (_: SuspendedPunter, command: SetDepositLimits)     => suspended(punterId, command)
    case (_: SuspendedPunter, command: SetSessionLimits)     => suspended(punterId, command)
    case (_: SuspendedPunter, command: SetStakeLimits)       => suspended(punterId, command)
    case (_: SuspendedPunter, command: StartSession)         => suspended(punterId, command)
    case (_: SuspendedPunter, command: KeepaliveSession)     => suspended(punterId, command)
    case (state: SuspendedPunter, command: EndSession)       => endSession(command, state, clock)
    case (_: SuspendedPunter, command: Unsuspend)            => unsuspend(command)
    case (state: SuspendedPunter, command: CompleteUnsuspend) =>
      completeUnsuspend(command, state.data.verifiedAt, state.data.verifiedBy, clock)
    case (_: SuspendedPunter, command: SetNegativeBalance) => setNegativeBalance(command)
    case (_: SuspendedPunter, command: UnverifyPunter)     => unverifyPunter(command)

    case (state: NegativeBalance, command: GetPunterProfile)  => getPunterProfile(state, command)
    case (_: NegativeBalance, command: Unsuspend)             => unsuspend(command)
    case (state: NegativeBalance, command: CompleteUnsuspend) => unsuspendNegativeBalancePunter(state, command, clock)
    case (state: NegativeBalance, command: EndCoolOff)        => endCoolOffNegativeBalance(punterId, state, command)
    case (state: NegativeBalance, command: StartSession)      => startSession(command, state, clock)
    case (state: NegativeBalance, command: KeepaliveSession)  => keepaliveSession(command, state)
    case (state: NegativeBalance, command: EndSession)        => endSession(command, state, clock)
    case (_: NegativeBalance, command: UnsetNegativeBalance)  => unsetNegativeBalance(command)
    case (_: NegativeBalance, command: UnverifyPunter)        => unverifyPunter(command)

    case (_, command: BeginSelfExclusion) => beginSelfExclusion(command)
    case (_, command: EndSelfExclusion)   => punterNotSelfExcluded(command)

    case (_, command: IncrementLoginFailureCounter)     => incrementLoginFailureCounter(command)
    case (_, command: IncrementFailedMFAAttemptCounter) => incrementFailedMFAAttemptCounter(command)
    case (_, command: ResetLoginContext)                => resetLoginContext(command)
    case (_, command: ResetPunterState)                 => resetPunterState(command)

    case (otherState, otherCommand) =>
      unhandledCommand(punterId, otherState, otherCommand)
  }

  private def createPunterProfile(command: CreatePunterProfile): ReplyEffect[PunterEvent, PunterState] = {
    val CreatePunterProfile(id, depositLimits, stakeLimits, sessionLimits, referral, isTestAccount, replyTo) =
      command
    log.info(s"Received request $command")

    Effect
      .persist(PunterProfileCreated(id, depositLimits, stakeLimits, sessionLimits, referral, isTestAccount))
      .thenReply(replyTo) { (profile: PunterState) =>
        log.info(s"Created punter profile $profile")
        Success.ProfileCreated(id, profile.asPunterProfileUnsafe())
      }
  }

  private def verifyPunter(command: VerifyPunter, clock: Clock): ReplyEffect[PunterEvent, PunterState] =
    Effect
      .persist(
        PunterVerified(
          command.punterId,
          command.activationPath,
          verifiedAt = clock.currentOffsetDateTime(),
          verifiedBy = None))
      .thenReply(command.replyTo) { _ =>
        Success.Verified(command.punterId)
      }

  private def unverifyPunter(command: UnverifyPunter): ReplyEffect[PunterEvent, PunterState] =
    Effect.persist(PunterUnverified(command.punterId)).thenReply(command.replyTo) { _ =>
      Success.Unverified(command.punterId)
    }

  private def getPunterProfile(
      profile: PunterProfile,
      command: GetPunterProfile): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Success.PunterProfileResponse(profile.data.punterId, profile))

  private def beginCoolOff(
      command: BeginCoolOff,
      state: HasSessions[_],
      clock: Clock): ReplyEffect[PunterEvent, PunterState] = {
    val BeginCoolOff(id, duration, cause, replyTo) = command
    val currentRefreshTokenTimeout = state.getCurrentSession.map(_.limitation.refreshTokenTimeout)
    val coolOffPeriod = {
      val startDate = clock.currentOffsetDateTime()
      val endTime = startDate.plusSeconds(duration.toSeconds)
      CoolOffPeriod(startDate, endTime)
    }
    Effect
      .persist(CoolOffExclusionBegan(id, coolOffPeriod, cause, currentRefreshTokenTimeout))
      .thenReply(replyTo)(_ => Success.CoolOffBegan(id, coolOffPeriod))
  }

  private def beginSelfExclusion(command: BeginSelfExclusion): ReplyEffect[PunterEvent, PunterState] = {
    val BeginSelfExclusion(id, selfExclusionOrigin, replyTo) = command
    Effect.persist(SelfExclusionBegan(id, selfExclusionOrigin)).thenReply(replyTo)(_ => Success.SelfExclusionBegan(id))
  }

  private def punterNotSelfExcluded(command: EndSelfExclusion): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.NotSelfExcluded(command.punterId))

  private def punterNotCoolingOff(command: EndCoolOff): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.NotInCoolOff(command.punterId))

  private def endCoolOffSelfExcludedPunter(
      punterId: PunterId,
      state: SelfExcludedPunter,
      command: EndCoolOff): ReplyEffect[PunterEvent, PunterState] =
    state.coolOffInfo.fold(punterIsSelfExcluded(punterId, command))(info => endCoolOff(state, info.cause, command))

  private def endCoolOffSuspendedPunter(
      punterId: PunterId,
      state: SuspendedPunter,
      command: EndCoolOff): ReplyEffect[PunterEvent, PunterState] =
    state.coolOffInfo.fold(suspended(punterId, command))(info => endCoolOff(state, info.cause, command))

  private def endCoolOffNegativeBalance(
      punterId: PunterId,
      state: NegativeBalance,
      command: EndCoolOff): ReplyEffect[PunterEvent, PunterState] =
    state.coolOffInfo.fold(suspended(punterId, command))(info => endCoolOff(state, info.cause, command))

  private def endCoolOff(
      state: HasSessions[_],
      cause: CoolOffCause,
      command: EndCoolOff): ReplyEffect[PunterEvent, PunterState] = {
    val EndCoolOff(id, replyTo) = command
    val refreshTokenTimeout = state.getCurrentSession.map(_.limitation.refreshTokenTimeout)
    Effect.persist(CoolOffEnded(id, cause, refreshTokenTimeout)).thenReply(replyTo)(_ => Success.CoolOffEnded(id))
  }

  private def endSelfExclusion(command: EndSelfExclusion): ReplyEffect[PunterEvent, PunterState] = {
    val EndSelfExclusion(id, replyTo) = command
    Effect.persist(SelfExclusionEnded(id)).thenReply(replyTo)(_ => Success.SelfExclusionEnded(id))
  }

  private def unsuspendSelfExcludedPunter(
      state: PunterState.SelfExcludedPunter,
      command: CompleteUnsuspend,
      clock: Clock): ReplyEffect[PunterEvent, PunterState] =
    state.currentSuspension.fold(notSuspended(command))(_ =>
      completeUnsuspend(command, state.data.verifiedAt, state.data.verifiedBy, clock))

  private def unsuspendNegativeBalancePunter(
      state: PunterState.NegativeBalance,
      command: CompleteUnsuspend,
      clock: Clock): ReplyEffect[PunterEvent, PunterState] =
    state.currentSuspension.fold(notSuspended(command))(_ =>
      completeUnsuspend(command, state.data.verifiedAt, state.data.verifiedBy, clock))

  private def suspend(command: Suspend, suspendedAt: OffsetDateTime): ReplyEffect[PunterEvent, PunterState] =
    Effect
      .persist(PunterSuspended(command.punterId, command.entity, suspendedAt = suspendedAt))
      .thenReply(command.replyTo)(_ => Success.Suspended(command.punterId))

  private def unsuspend(command: Unsuspend): ReplyEffect[PunterEvent, PunterState] =
    Effect
      .persist(PunterUnsuspendStarted(command.punterId, Some(command.adminId)))
      .thenReply(command.replyTo)(_ => Success.PunterUnsuspendStarted(command.punterId))

  private def setNegativeBalance(command: SetNegativeBalance): ReplyEffect[PunterEvent, PunterState] =
    Effect
      .persist(NegativeBalanceAccepted(command.punterId, command.entity.details))
      .thenReply(command.replyTo)(_ => Success.NegativeBalanceSet(command.punterId))

  private def unsetNegativeBalance(command: UnsetNegativeBalance): ReplyEffect[PunterEvent, PunterState] =
    Effect
      .persist(NegativeBalanceCancelled(command.punterId))
      .thenReply(command.replyTo)(_ => Success.NegativeBalanceUnset(command.punterId))

  private def completeUnsuspend(
      command: CompleteUnsuspend,
      alreadyVerifiedAt: Option[OffsetDateTime],
      verifiedBy: Option[AdminId],
      clock: Clock): ReplyEffect[PunterEvent, PunterState] = {
    val maybePunterVerified = alreadyVerifiedAt.fold(
      Seq(
        PunterVerified(
          command.punterId,
          verifiedAt = clock.currentOffsetDateTime(),
          activationPath = ActivationPath.Manual,
          verifiedBy = verifiedBy)))(_ => Seq.empty)

    val events =
      maybePunterVerified ++ Seq(PunterUnsuspended(command.punterId))
    Effect.persist(events).thenReply(command.replyTo)(_ => Success.PunterUnsuspendCompleted(command.punterId))
  }

  private def startSession[S <: PunterProfile](
      command: StartSession,
      state: S with HasSessions[S],
      clock: Clock): ReplyEffect[PunterEvent, PunterState] = {
    val timestamp = clock.currentOffsetDateTime()
    val sessionStats = state.getSessionStats(timestamp, clock)
    val newSession =
      StartedSession(
        command.sessionId,
        timestamp,
        SessionLimitation.fromStats(sessionStats, command.refreshTokenTimeout),
        command.ipAddress)
    restartSession(state, newSession, command.replyTo)
  }

  private def keepaliveSession[S <: PunterProfile](
      command: KeepaliveSession,
      state: S with HasSessions[S]): ReplyEffect[PunterEvent, PunterState] = {
    state.getCurrentSession
      .map { session =>
        Effect
          .persist(
            SessionUpdated(
              state.data.punterId,
              session.copy(limitation = session.limitation.updateRefreshTokentimeout(command.refreshTokenTimeout))))
          .thenReply(command.replyTo)((_: PunterState) => SessionKeepaliveResponse)
      }
      .getOrElse {
        Effect.reply[PunterResponse, PunterEvent, PunterState](command.replyTo)(SessionNotFound(command.punterId))
      }
  }

  private def startUnlimitedSession[S <: PunterProfile](
      command: StartSession,
      state: S with HasSessions[S],
      clock: Clock): ReplyEffect[PunterEvent, PunterState] = {
    val timestamp = clock.currentOffsetDateTime()
    val newSession =
      StartedSession(
        command.sessionId,
        timestamp,
        SessionLimitation.Unlimited(command.refreshTokenTimeout),
        command.ipAddress)
    restartSession(state, newSession, command.replyTo)
  }

  private def restartSession[S <: PunterProfile](
      punter: S with HasSessions[S],
      newSession: StartedSession,
      replyTo: ActorRef[PunterResponse]) = {
    val punterId = punter.data.punterId
    val events =
      punter.getCurrentSession
        .map(_.end(newSession.startedAt))
        .map(session => SessionEnded(punterId, session))
        .toList :+ SessionStarted(punterId, newSession, newSession.ipAddress)

    Effect.persist(events).thenReply(replyTo)((_: PunterState) => SessionStartedResponse(punterId, newSession))
  }

  private def endSession(
      command: EndSession,
      state: HasSessions[_],
      clock: Clock): ReplyEffect[PunterEvent, PunterState] =
    state.getCurrentSession
      .map { session =>
        val endedSession = session.end(clock.currentOffsetDateTime())
        Effect
          .persist(SessionEnded(command.punterId, endedSession))
          .thenReply(command.replyTo)((_: PunterState) => SessionEndedResponse(command.punterId, endedSession))
      }
      .getOrElse(sessionNotFound(command))

  private def incrementLoginFailureCounter(
      command: IncrementLoginFailureCounter): ReplyEffect[PunterEvent, PunterState] =
    Effect.persist(LoginFailureCounterIncremented(command.punterId)).thenReply(command.replyTo) { state =>
      IncrementLoginFailureCounterResponse(passwordResetRequired =
        state.asPunterProfileUnsafe().data.passwordResetRequired)
    }

  private def incrementFailedMFAAttemptCounter(
      command: IncrementFailedMFAAttemptCounter): ReplyEffect[PunterEvent, PunterState] =
    Effect.persist(FailedMFAAttemptCounterIncremented(command.punterId)).thenReply(command.replyTo) { state =>
      IncrementFailedMFAAttemptCounterResponse(passwordResetRequired =
        state.asPunterProfileUnsafe().data.passwordResetRequired)
    }

  def resetLoginContext(command: ResetLoginContext): ReplyEffect[PunterEvent, PunterState] =
    Effect
      .persist(LoginContextGotReset(command.punterId))
      .thenReply(command.replyTo)((_: PunterState) => LoginContextGotResetResponse(command.punterId))

  private def setSessionLimits(
      command: SetSessionLimits,
      state: ActivePunter,
      clock: Clock): ReplyEffect[PunterEvent, PunterState] = {
    val changedAt = clock.currentOffsetDateTime()
    val effectiveLimits = state.estimateLimitsChange(command.sessionLimits, changedAt, clock)
    val recalculatedSession = state.recalculateSessionLimitation(effectiveLimits, changedAt, clock)

    val events =
      sessionLimitChangedEvents(state, command.punterId, command.sessionLimits, changedAt, clock) ++ recalculatedSession
        .map(SessionUpdated(command.punterId, _))

    Effect.persist(events).thenReply(command.replyTo) { state: PunterState =>
      val punterProfile = state.asPunterProfileUnsafe()
      SessionLimitsSet(punterProfile.data.punterId, punterProfile.sessions.limits(changedAt, clock))
    }
  }

  def resetPunterState(command: ResetPunterState): ReplyEffect[PunterEvent, PunterState] =
    Effect
      .persist(PunterStateGotReset(command.punterId))
      .thenReply(command.replyTo)((_: PunterState) => PunterStateGotResetResponse(command.punterId))

  private def sessionLimitChangedEvents(
      state: ActivePunter,
      punterId: PunterId,
      requestedLimits: Limits[SessionDuration],
      now: OffsetDateTime,
      clock: Clock): List[PunterEvent] = {
    val currentLimits = state.estimateLimitsChange(state.sessions.limitsLog.limits(now, clock), now, clock)
    val newLimits = state.estimateLimitsChange(requestedLimits, now, clock)

    val maybeDailyLimitChanged =
      if (currentLimits.daily != newLimits.daily) Some(DailySessionLimitChanged(punterId, newLimits.daily)) else None

    val maybeWeeklyLimitChanged =
      if (currentLimits.weekly != newLimits.weekly) Some(WeeklySessionLimitChanged(punterId, newLimits.weekly))
      else None

    val maybeMonthlyLimitChanged =
      if (currentLimits.monthly != newLimits.monthly) Some(MonthlySessionLimitChanged(punterId, newLimits.monthly))
      else None

    maybeDailyLimitChanged.toList ++ maybeWeeklyLimitChanged.toList ++ maybeMonthlyLimitChanged.toList
  }

  private def setDepositLimits(
      state: ActivePunter,
      command: SetDepositLimits,
      clock: Clock): ReplyEffect[PunterEvent, PunterState] = {
    val changedAt = clock.currentOffsetDateTime()
    val events = depositLimitChangedEvents(state, command.punterId, command.depositLimits, changedAt, clock)

    Effect.persist(events).thenReply(command.replyTo) { state: PunterState =>
      val punterProfile = state.asPunterProfileUnsafe()
      val punterData = punterProfile.data
      DepositLimitsSet(punterData.punterId, punterData.depositLimitsLog.periodicLimits(changedAt, clock))
    }
  }

  private def depositLimitChangedEvents(
      state: ActivePunter,
      punterId: PunterId,
      requestedLimits: Limits[DepositLimitAmount],
      now: OffsetDateTime,
      clock: Clock): List[PunterEvent] = {
    val currentLimits = state.estimateDepositLimitsChange(state.data.depositLimitsLog.limits(now, clock), now, clock)
    val newLimits = state.estimateDepositLimitsChange(requestedLimits, now, clock)

    val maybeDailyLimitChanged =
      if (currentLimits.daily != newLimits.daily) Some(DailyDepositLimitChanged(punterId, newLimits.daily)) else None

    val maybeWeeklyLimitChanged =
      if (currentLimits.weekly != newLimits.weekly) Some(WeeklyDepositLimitChanged(punterId, newLimits.weekly))
      else None

    val maybeMonthlyLimitChanged =
      if (currentLimits.monthly != newLimits.monthly) Some(MonthlyDepositLimitChanged(punterId, newLimits.monthly))
      else None

    maybeDailyLimitChanged.toList ++ maybeWeeklyLimitChanged.toList ++ maybeMonthlyLimitChanged.toList
  }

  private def setStakeLimits(
      state: ActivePunter,
      command: SetStakeLimits,
      clock: Clock): ReplyEffect[PunterEvent, PunterState] = {
    val changedAt = clock.currentOffsetDateTime()
    val events = stakeLimitChangedEvents(state, command.punterId, command.stakeLimits, changedAt, clock)

    Effect.persist(events).thenReply(command.replyTo) { state: PunterState =>
      val punterProfile = state.asPunterProfileUnsafe()
      val punterData = punterProfile.data
      StakeLimitsSet(punterData.punterId, punterData.stakeLimitsLog.periodicLimits(changedAt, clock))
    }
  }

  private def stakeLimitChangedEvents(
      state: ActivePunter,
      punterId: PunterId,
      requestedLimits: Limits[StakeLimitAmount],
      now: OffsetDateTime,
      clock: Clock): List[PunterEvent] = {
    val currentLimits = state.estimateStakeLimitsChange(state.data.stakeLimitsLog.limits(now, clock), now, clock)
    val newLimits = state.estimateStakeLimitsChange(requestedLimits, now, clock)

    val maybeDailyLimitChanged =
      if (currentLimits.daily != newLimits.daily) Some(DailyStakeLimitChanged(punterId, newLimits.daily)) else None

    val maybeWeeklyLimitChanged =
      if (currentLimits.weekly != newLimits.weekly) Some(WeeklyStakeLimitChanged(punterId, newLimits.weekly))
      else None

    val maybeMonthlyLimitChanged =
      if (currentLimits.monthly != newLimits.monthly) Some(MonthlyStakeLimitChanged(punterId, newLimits.monthly))
      else None

    maybeDailyLimitChanged.toList ++ maybeWeeklyLimitChanged.toList ++ maybeMonthlyLimitChanged.toList
  }

  private def punterDoesNotExist(punterId: PunterId, command: BusinessCommand): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.DoesNotExist(punterId))

  private def punterAlreadyExists(command: CreatePunterProfile): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.AlreadyExists(command.punterId))

  private def notSuspended(command: Unsuspend): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.NotSuspended(command.punterId))

  private def notSuspended(command: CompleteUnsuspend): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.NotSuspended(command.punterId))

  private def punterIsCoolingOff(command: BusinessCommand): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.InCoolOff(command.punterId))

  private def punterIsSelfExcluded(
      punterId: PunterId,
      command: BusinessCommand): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.SelfExcluded(punterId))

  private def suspended(punterId: PunterId, command: BusinessCommand): ReplyEffect[PunterEvent, PunterState] = {
    Effect.reply(command.replyTo)(Failure.Suspended(punterId))
  }

  private def alreadySuspended(punterId: PunterId, command: BusinessCommand): ReplyEffect[PunterEvent, PunterState] =
    Effect.reply(command.replyTo)(Failure.AlreadySuspended(punterId))

  private def sessionNotFound(command: BusinessCommand): ReplyEffect[PunterEvent, PunterState] = {
    Effect.reply[PunterResponse, PunterEvent, PunterState](command.replyTo)(SessionNotFound(command.punterId))
  }

  private def unhandledCommand(
      punterId: PunterId,
      state: PunterState,
      command: BusinessCommand): ReplyEffect[PunterEvent, PunterState] = {
    log.warn(s"Ignoring punter command $command in state $state")
    Effect.reply(command.replyTo)(Failure.UnhandledCommandResponse(punterId))
  }
}

private object PunterEventHandler {
  type EventHandler = EventSourcedBehavior.EventHandler[PunterState, PunterEvent]

  def apply(): EventHandler = {
    case (NotExistingPunter, event: PunterProfileCreated) =>
      UnverifiedPunter(
        data = PunterProfileData(
          event.punterId,
          LimitsLog.withLimits(event.depositLimits),
          LimitsLog.withLimits(event.stakeLimits),
          event.referralCode,
          loginFailureCount = LoginFailureCount.Initial,
          isTestAccount = event.isTestAccount,
          invalidMFAAttemptCounter = InvalidMFAAttemptCounter.Initial,
          passwordResetRequired = false,
          verifiedAt = None,
          activationPath = None,
          verifiedBy = None),
        sessions = PunterSessions.withLimits(event.sessionLimits))

    case (state: UnverifiedPunter, event: PunterSuspended) => state.suspend(event.entity)
    case (state: UnverifiedPunter, event: PunterVerified)  => state.verified(event.verifiedAt, event.activationPath)
    case (state: UnverifiedPunter, event: SessionStarted)  => startNewSession(state, event.session)
    case (state: UnverifiedPunter, event: SessionUpdated)  => state.updateSession(event.session)
    case (state: UnverifiedPunter, event: SessionEnded)    => state.endSession(event.session.endedAt)

    case (state: ActivePunter, event: CoolOffExclusionBegan)      => state.coolOff(event.coolOffPeriod, event.cause)
    case (state: ActivePunter, event: SelfExclusionBegan)         => state.selfExclude(event.selfExclusionOrigin)
    case (state: ActivePunter, event: DailyDepositLimitChanged)   => state.withDailyDepositLimit(event.limit)
    case (state: ActivePunter, event: WeeklyDepositLimitChanged)  => state.withWeeklyDepositLimit(event.limit)
    case (state: ActivePunter, event: MonthlyDepositLimitChanged) => state.withMonthlyDepositLimit(event.limit)
    case (state: ActivePunter, event: DailySessionLimitChanged)   => state.withDailySessionLimit(event.limit)
    case (state: ActivePunter, event: WeeklySessionLimitChanged)  => state.withWeeklySessionLimit(event.limit)
    case (state: ActivePunter, event: MonthlySessionLimitChanged) => state.withMonthlySessionLimit(event.limit)
    case (state: ActivePunter, event: DailyStakeLimitChanged)     => state.withDailyStakeLimit(event.limits)
    case (state: ActivePunter, event: WeeklyStakeLimitChanged)    => state.withWeeklyStakeLimit(event.limits)
    case (state: ActivePunter, event: MonthlyStakeLimitChanged)   => state.withMonthlyStakeLimit(event.limits)
    case (state: ActivePunter, event: PunterSuspended)            => state.suspend(event.entity)
    case (state: ActivePunter, event: NegativeBalanceAccepted)    => state.negativeBalance(event.reason)
    case (state: ActivePunter, event: SessionStarted)             => startNewSession(state, event.session)
    case (state: ActivePunter, event: SessionUpdated)             => state.updateSession(event.session)
    case (state: ActivePunter, event: SessionEnded)               => state.endSession(event.session.endedAt)
    case (state: ActivePunter, _: PunterUnverified)               => state.unverified()

    case (state: CoolOffPunter, _: CoolOffEnded)                => state.reactivate()
    case (state: CoolOffPunter, event: PunterSuspended)         => state.suspend(event.entity)
    case (state: CoolOffPunter, event: NegativeBalanceAccepted) => state.negativeBalance(event.reason)
    case (state: CoolOffPunter, event: SessionStarted)          => startNewSession(state, event.session)
    case (state: CoolOffPunter, event: SessionUpdated)          => state.updateSession(event.session)
    case (state: CoolOffPunter, event: SessionEnded)            => state.endSession(event.session.endedAt)
    case (state: CoolOffPunter, event: SelfExclusionBegan)      => state.selfExclude(event.selfExclusionOrigin)
    case (state: CoolOffPunter, _: PunterUnverified)            => state.unverified()

    case (state: SelfExcludedPunter, _: CoolOffEnded)                => state.endCoolOff()
    case (state: SelfExcludedPunter, event: PunterUnsuspendStarted)  => state.updateVerifiedBy(event.verifiedBy)
    case (state: SelfExcludedPunter, event: NegativeBalanceAccepted) => state.negativeBalance(event.reason)
    case (state: SelfExcludedPunter, _: PunterUnsuspended)           => state.unsuspend()
    case (state: SelfExcludedPunter, event: SessionStarted)          => startNewSession(state, event.session)
    case (state: SelfExcludedPunter, event: SessionUpdated)          => state.updateSession(event.session)
    case (state: SelfExcludedPunter, event: SessionEnded)            => state.endSession(event.session.endedAt)
    case (state: SelfExcludedPunter, _: SelfExclusionEnded)          => state.endSelfExclusion()
    case (state: SelfExcludedPunter, event: PunterVerified)          => state.verified(event.verifiedAt, event.activationPath)
    case (state: SelfExcludedPunter, _: PunterUnverified)            => state.unverified()

    case (state: SuspendedPunter, _: CoolOffEnded)                => state.endCoolOff()
    case (state: SuspendedPunter, event: PunterUnsuspendStarted)  => state.updateVerifiedBy(event.verifiedBy)
    case (state: SuspendedPunter, event: NegativeBalanceAccepted) => state.negativeBalance(event.reason)
    case (state: SuspendedPunter, _: PunterUnsuspended)           => state.unsuspend()
    case (state: SuspendedPunter, event: SelfExclusionBegan)      => state.selfExclude(event.selfExclusionOrigin)
    case (state: SuspendedPunter, event: SessionEnded)            => state.endSession(event.session.endedAt)
    case (state: SuspendedPunter, event: PunterVerified)          => state.verified(event.verifiedAt, event.activationPath)
    case (state: SuspendedPunter, _: PunterUnverified)            => state.unverified()

    case (state: NegativeBalance, _: NegativeBalanceCancelled) => state.reactivate()
    case (state: NegativeBalance, _: SelfExclusionEnded)       => state.endSelfExclusion()
    case (state: NegativeBalance, _: CoolOffEnded)             => state.endCoolOff()
    case (state: NegativeBalance, _: PunterUnsuspended)        => state.unsuspend()
    case (state: NegativeBalance, event: SessionStarted)       => startNewSession(state, event.session)
    case (state: NegativeBalance, event: SessionUpdated)       => state.updateSession(event.session)
    case (state: NegativeBalance, event: SessionEnded)         => state.endSession(event.session.endedAt)
    case (state: NegativeBalance, _: PunterUnverified)         => state.unverified()

    case (state: PunterProfile, _: LoginFailureCounterIncremented)     => state.incrementLoginFailureCounter()
    case (state: PunterProfile, _: FailedMFAAttemptCounterIncremented) => state.incrementMFAAttemptCounter()
    case (state: PunterProfile, _: LoginContextGotReset)               => state.resetLoginContext()
    case (state: PunterProfile, _: PunterStateGotReset)                => state.resetPunterState()
    case (state: PunterState, event: PunterEvent) =>
      throw new IllegalStateException(s"unexpected event [$event] in state [$state]")
  }

  private def startNewSession[State <: PunterProfile](
      state: PunterProfile with HasSessions[State],
      session: StartedSession): PunterState =
    state
      .startSession(session)
      .updateLoginFailureCount(_ => LoginFailureCount.Initial)
      .updateInvalidMFAAttemptCounter(_ => InvalidMFAAttemptCounter.Initial)
}
